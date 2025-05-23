// public/js/client.js
const socket = io();
const myUserId = localStorage.getItem('userId');
const myUsername = localStorage.getItem('username');
let currentReceiverId = null;
let currentConversationId = null;
let isGroupChat = false;
let displayedTaskIds = new Set(); // Theo dõi ID công việc để tránh trùng lặp

// 
// Biến cho bảng trắng
let canvas, ctx;
let isDrawing = false;
let currentColor = 'black';
let isWhiteboardOpen = false;

// Khởi tạo bảng trắng
const initWhiteboard = () => {
    canvas = document.getElementById('whiteboard');
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    isWhiteboardOpen = true;

    // Yêu cầu trạng thái bảng hiện tại
    socket.emit('requestWhiteboardState', { conversationId: currentConversationId });
};

// Bắt đầu vẽ
const startDrawing = (e) => {
    isDrawing = true;
    draw(e);
    socket.emit('whiteboardActivity', {
        conversationId: currentConversationId,
        userId: myUserId,
        action: 'drawing'
    });
};

// Dừng vẽ
const stopDrawing = () => {
    isDrawing = false;
    ctx.beginPath();
};

// Vẽ và gửi tọa độ
const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    socket.emit('whiteboardDraw', {
        conversationId: currentConversationId,
        x,
        y,
        color: currentColor,
        isNewStroke: e.type === 'mousedown'
    });
};

// Nhận và vẽ từ người khác
socket.on('whiteboardDraw', ({ x, y, color, isNewStroke }) => {
    if (!isWhiteboardOpen) return; // Chỉ vẽ nếu bảng đang mở
    ctx.strokeStyle = color;
    if (isNewStroke) {
        ctx.beginPath();
        ctx.moveTo(x, y);
    } else {
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
});

// Nhận trạng thái bảng trắng
socket.on('whiteboardState', ({ imageData }) => {
    if (!isWhiteboardOpen) return;
    if (imageData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = imageData;
    }
});

// Chọn màu
const setColor = (color) => {
    currentColor = color;
    ctx.strokeStyle = color;
    socket.emit('whiteboardActivity', {
        conversationId: currentConversationId,
        userId: myUserId,
        action: `change color to ${color}`
    });
};

// Xóa bảng
const clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('whiteboardClear', { conversationId: currentConversationId });
    socket.emit('whiteboardActivity', {
        conversationId: currentConversationId,
        userId: myUserId,
        action: 'clear canvas'
    });
};

// Nhận xóa từ người khác
socket.on('whiteboardClear', () => {
    if (!isWhiteboardOpen) return; // Chỉ xóa nếu bảng đang mở
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Lưu bảng trắng thành ảnh
const saveWhiteboard = () => {
    const dataURL = canvas.toDataURL('image/png');
    const fileName = `whiteboard_${Date.now()}.png`;
    socket.emit('sendMessage', {
        senderId: myUserId,
        conversationId: currentConversationId,
        content: '',
        file: dataURL,
        fileName
    });
    socket.emit('whiteboardActivity', {
        conversationId: currentConversationId,
        userId: myUserId,
        action: 'save whiteboard'
    });
};

// Mở bảng trắng
const openWhiteboard = () => {
    if (!isGroupChat) {
        alert('Chỉ khả dụng trong nhóm!');
        return;
    }
    const modal = document.getElementById('whiteboardModal');
    modal.style.display = 'flex';
    if (!isWhiteboardOpen) {
        initWhiteboard();
    }
};

// Đóng bảng trắng
const closeWhiteboard = () => {
    const modal = document.getElementById('whiteboardModal');
    modal.style.display = 'none';
    isWhiteboardOpen = false;
    socket.emit('whiteboardActivity', {
        conversationId: currentConversationId,
        userId: myUserId,
        action: 'close whiteboard'
    });
};

// Nhận thông báo hoạt động bảng trắng
socket.on('whiteboardActivity', ({ userId, action, username }) => {
    if (currentConversationId) {
        const toast = document.createElement('div');
        toast.className = 'new-message-toast';
        toast.textContent = `${username} đang ${action} trên bảng trắng`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});
// 

socket.on('connect', () => {
    console.log('Đã kết nối tới server');
    if (!myUserId) console.error('myUserId không tồn tại!');
    socket.emit('join', { userId: myUserId });
});

const displayUsername = () => {
    const usernameElement = document.getElementById('current_username');
    if (myUsername) {
        usernameElement.textContent = myUsername;
    } else {
        usernameElement.textContent = 'Không xác định';
    }
};

const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = '/login';
};

const searchUser = async () => {
    const query = document.getElementById('search_user').value.trim();
    if (!query) return;

    try {
        const response = await fetch(`/api/search?q=${query}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const users = await response.json();
        const searchResults = document.getElementById('search_results');
        searchResults.innerHTML = users.length === 0 ? '<li>Không tìm thấy</li>' : '';

        users.forEach(user => {
            if (user._id !== myUserId) {               
                const li = document.createElement('li');
                li.textContent = user.full_name;

                const chatBtn = document.createElement('button');
                chatBtn.textContent = 'Chat';
                chatBtn.onclick = () => startChat(user._id, user.full_name);

                const friendBtn = document.createElement('button');
                friendBtn.textContent = 'Kết bạn';
                friendBtn.onclick = () => sendFriendRequest(user._id);

                li.appendChild(chatBtn);
                li.appendChild(friendBtn);
                searchResults.appendChild(li);
            }
        });
    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
    }
};

const sendFriendRequest = async (friendId) => {
    try {
        const response = await fetch('/api/friends/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: myUserId, friendId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        alert(data.message);
        loadFriendRequests();
        socket.emit('sendFriendRequest', { userId: myUserId, friendId });
    } catch (error) {
        console.error('Lỗi gửi lời mời:', error);
        alert('Lỗi: ' + error.message);
    }
};

const loadFriends = async () => {
    try {
        const response = await fetch(`/api/friends/${myUserId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const friends = await response.json();
        const friendList = document.getElementById('friend_list');
        friendList.innerHTML = '';

        friends.forEach(friend => {
            const li = document.createElement('li');
            li.textContent = friend.full_name;
            li.dataset.userId = friend._id;
            if (friend.status === 'online') {
                li.classList.add('online');
            }
            li.addEventListener('click', () => startChat(friend._id, friend.full_name));
            friendList.appendChild(li);
        });
    } catch (error) {
        console.error('Lỗi tải bạn bè:', error);
    }
};

const loadFriendRequests = async () => {
    try {
        const response = await fetch(`/api/friends/requests/${myUserId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const requests = await response.json();
        const requestList = document.getElementById('friend_requests');
        requestList.innerHTML = '';

        requests.forEach(req => {
            const li = document.createElement('li');
            li.textContent = req.full_name;

            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Chấp nhận';
            acceptBtn.onclick = () => acceptFriendRequest(req._id);

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = 'Từ chối';
            rejectBtn.onclick = () => rejectFriendRequest(req._id);

            li.appendChild(acceptBtn);
            li.appendChild(rejectBtn);
            requestList.appendChild(li);
        });
    } catch (error) {
        console.error('Lỗi tải lời mời:', error);
    }
};

const acceptFriendRequest = async (friendId) => {
    try {
        const response = await fetch('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: myUserId, friendId })
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        alert(data.message);
        socket.emit('acceptFriendRequest', { userId: myUserId, friendId });
        loadFriends();
        loadFriendRequests();
    } catch (error) {
        console.error('Lỗi chấp nhận lời mời:', error);
    }
};

const rejectFriendRequest = async (friendId) => {
    try {
        const response = await fetch('/api/friends/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: myUserId, friendId })
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        alert(data.message);
        loadFriendRequests();
    } catch (error) {
        console.error('Lỗi từ chối lời mời:', error);
    }
};

const loadGroups = async () => {
    try {
        const response = await fetch(`/api/groups/${myUserId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const groups = await response.json();
        const groupList = document.getElementById('group_list');
        groupList.innerHTML = '';

        groups.forEach(group => {
            const li = document.createElement('li');
            li.textContent = group.groupName;
            li.dataset.conversationId = group._id;
            li.addEventListener('click', () => startGroupChat(group._id, group.groupName));
            groupList.appendChild(li);
        });
    } catch (error) {
        console.error('Lỗi tải danh sách nhóm:', error);
    }
};

const openGroupModal = async () => {
    const modal = document.getElementById('createGroupModal');
    const friendCheckboxes = document.getElementById('friend_checkboxes');
    friendCheckboxes.innerHTML = '';

    try {
        const response = await fetch(`/api/friends/${myUserId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const friends = await response.json();

        friends.forEach(friend => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" value="${friend._id}" id="friend_${friend._id}">
                <label for="friend_${friend._id}">${friend.full_name}</label>
            `;
            friendCheckboxes.appendChild(li);
        });

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Lỗi tải danh sách bạn bè:', error);
    }
};

const closeGroupModal = () => {
    const modal = document.getElementById('createGroupModal');
    modal.style.display = 'none';
    document.getElementById('group_name').value = '';
    document.querySelectorAll('#friend_checkboxes input').forEach(input => input.checked = false);
};

const createGroup = async () => {
    const groupName = document.getElementById('group_name').value.trim();
    const memberIds = Array.from(document.querySelectorAll('#friend_checkboxes input:checked')).map(input => input.value);

    if (!groupName || memberIds.length === 0) {
        alert('Vui lòng nhập tên nhóm và chọn ít nhất một thành viên!');
        return;
    }

    try {
        const response = await fetch('/api/groups/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: myUserId, groupName, memberIds })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        alert(data.message);
        closeGroupModal();
        loadGroups();
    } catch (error) {
        console.error('Lỗi tạo nhóm:', error);
        alert('Lỗi: ' + error.message);
    }
};

const openAddMemberModal = async () => {
    const modal = document.getElementById('addMemberModal');
    const friendCheckboxes = document.getElementById('add_member_checkboxes');
    friendCheckboxes.innerHTML = '';

    try {
        const friendResponse = await fetch(`/api/friends/${myUserId}`);
        if (!friendResponse.ok) throw new Error(`HTTP error! Status: ${friendResponse.status}`);
        const friends = await friendResponse.json();

        const groupResponse = await fetch(`/api/groups/${myUserId}`);
        if (!groupResponse.ok) throw new Error(`HTTP error! Status: ${groupResponse.status}`);
        const groups = await groupResponse.json();
        const currentGroup = groups.find(group => group._id === currentConversationId);
        if (!currentGroup) throw new Error('Không tìm thấy nhóm');

        const currentMemberIds = currentGroup.participants.map(member => member._id.toString());

        const availableFriends = friends.filter(friend => !currentMemberIds.includes(friend._id));

        if (availableFriends.length === 0) {
            friendCheckboxes.innerHTML = '<li>Không còn bạn bè để thêm</li>';
        } else {
            availableFriends.forEach(friend => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <input type="checkbox" value="${friend._id}" id="add_friend_${friend._id}">
                    <label for="add_friend_${friend._id}">${friend.full_name}</label>
                `;
                friendCheckboxes.appendChild(li);
            });
        }

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Lỗi tải danh sách bạn bè:', error);
        friendCheckboxes.innerHTML = '<li>Lỗi tải danh sách bạn bè</li>';
    }
};

const closeAddMemberModal = () => {
    const modal = document.getElementById('addMemberModal');
    modal.style.display = 'none';
    document.querySelectorAll('#add_member_checkboxes input').forEach(input => input.checked = false);
};

const addMemberToGroup = async () => {
    const newMemberIds = Array.from(document.querySelectorAll('#add_member_checkboxes input:checked')).map(input => input.value);

    if (newMemberIds.length === 0) {
        alert('Vui lòng chọn ít nhất một thành viên để thêm!');
        return;
    }

    try {
        const response = await fetch('/api/groups/add-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: currentConversationId, userId: myUserId, newMemberIds })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        alert(data.message);
        closeAddMemberModal();
        socket.emit('addMember', { groupId: currentConversationId, userId: myUserId, newMemberIds });
    } catch (error) {
        console.error('Lỗi thêm thành viên:', error);
        alert('Lỗi: ' + error.message);
    }
};

const openLibraryModal = async () => {
    const modal = document.getElementById('libraryModal');
    const fileList = document.getElementById('library_files');
    fileList.innerHTML = '';

    try {
        const response = await fetch(`/api/groups/files/${currentConversationId}/${myUserId}/library`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const files = await response.json();

        if (files.length === 0) {
            fileList.innerHTML = '<li>Chưa có tài liệu nào</li>';
        } else {
            files.forEach(file => {
                const li = document.createElement('li');
                const fileLink = document.createElement('a');
                fileLink.href = file.file;
                fileLink.textContent = file.fileName || 'Tải file';
                fileLink.download = file.fileName;
                fileLink.target = '_blank';

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Xóa';
                deleteBtn.onclick = () => deleteGroupFile(file._id);

                li.appendChild(fileLink);
                li.appendChild(document.createTextNode(` - ${file.sender.full_name} - ${new Date(file.createdAt).toLocaleString()}`));
                li.appendChild(deleteBtn);
                fileList.appendChild(li);
            });
        }

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Lỗi tải thư viện tài liệu:', error);
        fileList.innerHTML = `<li>Lỗi tải tài liệu: ${error.message}</li>`;
    }
};

const closeLibraryModal = () => {
    const modal = document.getElementById('libraryModal');
    modal.style.display = 'none';
    document.getElementById('search_library').value = '';
    document.getElementById('library_file').value = '';
    document.getElementById('library_file_name').textContent = '';
};

const searchLibrary = () => {
    const query = document.getElementById('search_library').value.trim().toLowerCase();
    const fileList = document.getElementById('library_files');
    const items = fileList.getElementsByTagName('li');

    Array.from(items).forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
};

const openMediaModal = async () => {
    const modal = document.getElementById('mediaModal');
    const fileList = document.getElementById('media_files');
    fileList.innerHTML = '';

    try {
        const response = await fetch(`/api/groups/files/${currentConversationId}/${myUserId}/media`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const files = await response.json();

        if (files.length === 0) {
            fileList.innerHTML = '<li>Chưa có file/ảnh nào</li>';
        } else {
            files.forEach(file => {
                const li = document.createElement('li');
                const fileLink = document.createElement('a');
                fileLink.href = file.file;
                fileLink.textContent = file.fileName || 'Tải file';
                fileLink.download = file.fileName;
                fileLink.target = '_blank';

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Xóa';
                deleteBtn.onclick = () => deleteGroupFile(file._id);

                li.appendChild(fileLink);
                li.appendChild(document.createTextNode(` - ${file.sender.full_name} - ${new Date(file.createdAt).toLocaleString()}`));
                li.appendChild(deleteBtn);
                fileList.appendChild(li);
            });
        }

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Lỗi tải file/ảnh:', error);
        fileList.innerHTML = `<li>Lỗi tải file/ảnh: ${error.message}</li>`;
    }
};

const closeMediaModal = () => {
    const modal = document.getElementById('mediaModal');
    modal.style.display = 'none';
    document.getElementById('search_media').value = '';
};

const searchMedia = () => {
    const query = document.getElementById('search_media').value.trim().toLowerCase();
    const fileList = document.getElementById('media_files');
    const items = fileList.getElementsByTagName('li');

    Array.from(items).forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
};

const uploadLibraryFile = () => {
    const fileInput = document.getElementById('library_file');
    const file = fileInput.files[0];
    if (!file) {
        alert('Vui lòng chọn file để upload!');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const response = await fetch('/api/groups/upload-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: currentConversationId,
                    userId: myUserId,
                    file: e.target.result,
                    fileName: file.name
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
            alert(data.message);
            socket.emit('uploadLibraryFile', {
                groupId: currentConversationId,
                userId: myUserId,
                file: e.target.result,
                fileName: file.name
            });
            openLibraryModal();
            fileInput.value = '';
            document.getElementById('library_file_name').textContent = '';
        } catch (error) {
            console.error('Lỗi upload file:', error);
            alert('Lỗi: ' + error.message);
        }
    };
    reader.readAsDataURL(file);
};

const deleteGroupFile = async (fileId) => {
    if (!confirm('Bạn có chắc muốn xóa file này?')) return;

    try {
        const response = await fetch('/api/groups/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: currentConversationId, userId: myUserId, fileId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        alert(data.message);
        openLibraryModal();
        openMediaModal();
    } catch (error) {
        console.error('Lỗi xóa file:', error);
        alert('Lỗi: ' + error.message);
    }
};

const openTasksModal = async () => {
    const modal = document.getElementById('tasksModal');
    const taskList = document.getElementById('task_list');
    taskList.innerHTML = ''; // Xóa sạch danh sách trước khi tải
    displayedTaskIds.clear(); // Reset Set để tránh giữ ID cũ

    try {
        const response = await fetch(`/api/groups/tasks/${currentConversationId}/${myUserId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const tasks = await response.json();

        if (tasks.length === 0) {
            taskList.innerHTML = '<li>Chưa có công việc nào</li>';
        } else {
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.dataset.taskId = task._id;
                li.innerHTML = `
                    <input type="checkbox" ${task.isCompleted ? 'checked' : ''} onchange="toggleTaskCompletion('${task._id}', this.checked)">
                    <span class="task-title">${task.title}</span>
                    <span class="task-description">${task.description || ''}</span>
                    <span> - ${task.creator.full_name} - ${new Date(task.createdAt).toLocaleString()}</span>
                    <button class="edit-task" onclick="editTask('${task._id}', '${task.title}', '${task.description || ''}')">Sửa</button>
                    <button class="delete-task" onclick="deleteTask('${task._id}')">Xóa</button>
                `;
                if (task.isCompleted) {
                    li.classList.add('completed');
                }
                taskList.appendChild(li);
                displayedTaskIds.add(task._id); // Thêm ID vào Set
            });
        }

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Lỗi tải checklist công việc:', error);
        taskList.innerHTML = `<li>Lỗi tải công việc: ${error.message}</li>`;
    }
};

const closeTasksModal = () => {
    const modal = document.getElementById('tasksModal');
    modal.style.display = 'none';
    document.getElementById('search_tasks').value = '';
    document.getElementById('task_title').value = '';
    document.getElementById('task_description').value = '';
};

const searchTasks = () => {
    const query = document.getElementById('search_tasks').value.trim().toLowerCase();
    const taskList = document.getElementById('task_list');
    const items = taskList.getElementsByTagName('li');

    Array.from(items).forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
};

const addTask = async () => {
    const title = document.getElementById('task_title').value.trim();
    const description = document.getElementById('task_description').value.trim();

    if (!title) {
        alert('Vui lòng nhập tiêu đề công việc!');
        return;
    }

    try {
        const response = await fetch('/api/groups/tasks/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: currentConversationId,
                userId: myUserId,
                title,
                description
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        socket.emit('createTask', {
            groupId: currentConversationId,
            userId: myUserId,
            title,
            description
        });
        document.getElementById('task_title').value = '';
        document.getElementById('task_description').value = '';
    } catch (error) {
        console.error('Lỗi thêm công việc:', error);
        alert('Lỗi: ' + error.message);
    }
};

const editTask = async (taskId, currentTitle, currentDescription) => {
    const title = prompt('Nhập tiêu đề mới:', currentTitle);
    if (title === null) return;
    const description = prompt('Nhập mô tả mới:', currentDescription);

    try {
        const response = await fetch('/api/groups/tasks/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: currentConversationId,
                userId: myUserId,
                taskId,
                title,
                description
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        socket.emit('updateTask', {
            groupId: currentConversationId,
            userId: myUserId,
            taskId,
            title,
            description
        });
    } catch (error) {
        console.error('Lỗi sửa công việc:', error);
        alert('Lỗi: ' + error.message);
    }
};

const toggleTaskCompletion = async (taskId, isCompleted) => {
    try {
        const response = await fetch('/api/groups/tasks/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: currentConversationId,
                userId: myUserId,
                taskId,
                isCompleted
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        socket.emit('updateTask', {
            groupId: currentConversationId,
            userId: myUserId,
            taskId,
            isCompleted
        });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái công việc:', error);
        alert('Lỗi: ' + error.message);
    }
};

const deleteTask = async (taskId) => {
    if (!confirm('Bạn có chắc muốn xóa công việc này?')) return;

    try {
        const response = await fetch('/api/groups/tasks/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: currentConversationId, userId: myUserId, taskId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        socket.emit('deleteTask', { groupId: currentConversationId, userId: myUserId, taskId });
    } catch (error) {
        console.error('Lỗi xóa công việc:', error);
        alert('Lỗi: ' + error.message);
    }
};

const startChat = (receiverId, name) => {
    currentReceiverId = receiverId;
    currentConversationId = null;
    isGroupChat = false;

    const chatWithElement = document.getElementById('chat_with');
    const addMemberButton = document.getElementById('btn_add_member');
    const libraryButton = document.getElementById('btn_library');
    const mediaButton = document.getElementById('btn_media');
    const tasksButton = document.getElementById('btn_tasks');
    if (chatWithElement) chatWithElement.textContent = name;
    if (addMemberButton) addMemberButton.style.display = 'none';
    if (libraryButton) libraryButton.style.display = 'none';
    if (mediaButton) mediaButton.style.display = 'none';
    if (tasksButton) tasksButton.style.display = 'none';

    createOrGetConversation(receiverId);
};

const startGroupChat = (conversationId, groupName) => {
    currentReceiverId = null;
    currentConversationId = conversationId;
    isGroupChat = true;

    const chatWithElement = document.getElementById('chat_with');
    const addMemberButton = document.getElementById('btn_add_member');
    const libraryButton = document.getElementById('btn_library');
    const mediaButton = document.getElementById('btn_media');
    const tasksButton = document.getElementById('btn_tasks');
    if (chatWithElement) chatWithElement.textContent = groupName;
    if (addMemberButton) addMemberButton.style.display = 'inline-block';
    if (libraryButton) libraryButton.style.display = 'inline-block';
    if (mediaButton) mediaButton.style.display = 'inline-block';
    if (tasksButton) tasksButton.style.display = 'inline-block';

    loadMessages(conversationId);
};

const createOrGetConversation = async (receiverId) => {
    try {
        const participants = [myUserId, receiverId].sort();
        const response = await fetch('/api/conversations/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        currentConversationId = data.conversation._id;
        loadMessages(currentConversationId);
    } catch (error) {
        console.error('Lỗi tạo/lấy conversation:', error);
    }
};

const loadMessages = async (conversationId) => {
    try {
        const response = await fetch(`/api/messages/messages?sender=${myUserId}&conversationId=${conversationId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const messages = await response.json();
        const ulMessage = document.getElementById('ul_message');
        ulMessage.innerHTML = '';

        if (messages.length === 0) {
            ulMessage.innerHTML = '<li>Chưa có tin nhắn nào</li>';
        } else {
            messages.forEach(msg => {
                const li = document.createElement('li');
                if (msg.content) {
                    li.appendChild(document.createTextNode(`${msg.sender.full_name}: ${msg.content}`));
                }
                if (msg.file && !msg.isLibraryUpload) {
                    if (msg.file.match(/^\/Uploads\/.*\.(jpg|jpeg|png|gif)$/i)) {
                        const img = document.createElement('img');
                        img.src = msg.file;
                        img.alt = 'Hình ảnh';
                        img.onclick = () => openImageModal(msg.file);
                        li.appendChild(img);
                    } else {
                        const link = document.createElement('a');
                        link.href = msg.file;
                        link.textContent = msg.fileName || 'Tải file';
                        link.download = msg.fileName;
                        link.target = '_blank';
                        li.appendChild(link);
                    }
                }
                li.className = msg.sender._id === myUserId ? 'right' : '';
                ulMessage.appendChild(li);
            });
        }
        ulMessage.scrollTop = ulMessage.scrollHeight;
    } catch (error) {
        console.error('Lỗi tải tin nhắn:', error);
        document.getElementById('ul_message').innerHTML = `<li>Lỗi tải tin nhắn: ${error.message}</li>`;
    }
};

const loadPendingMessages = async () => {
    try {
        const response = await fetch(`/api/messages/pendingMessages?userId=${myUserId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const pendingMessages = await response.json();
        const ulPending = document.getElementById('pending_list');
        ulPending.innerHTML = '';

        const groupedMessages = {};
        pendingMessages.forEach(message => {
            const senderId = message.sender._id;
            if (!groupedMessages[senderId]) {
                groupedMessages[senderId] = { sender: message.sender, messages: [] };
            }
            groupedMessages[senderId].messages.push(message);
        });

        for (const senderId in groupedMessages) {
            const sender = groupedMessages[senderId].sender;
            const li = document.createElement('li');
            li.textContent = sender.username;
            li.onclick = () => startPendingChat(sender._id, sender.username);
            ulPending.appendChild(li);
        }
    } catch (error) {
        console.error('Lỗi tải tin nhắn chờ:', error);
        document.getElementById('pending_list').innerHTML = '<li>Lỗi tải tin nhắn chờ</li>';
    }
};

const startPendingChat = (senderId, name) => {
    currentReceiverId = senderId;
    currentConversationId = null;
    isGroupChat = false;

    const chatWithElement = document.getElementById('chat_with');
    const addMemberButton = document.getElementById('btn_add_member');
    const libraryButton = document.getElementById('btn_library');
    const mediaButton = document.getElementById('btn_media');
    const tasksButton = document.getElementById('btn_tasks');
    if (chatWithElement) chatWithElement.textContent = name;
    if (addMemberButton) addMemberButton.style.display = 'none';
    if (libraryButton) libraryButton.style.display = 'none';
    if (mediaButton) mediaButton.style.display = 'none';
    if (tasksButton) tasksButton.style.display = 'none';

    createOrGetConversation(senderId);
};

const sendMessage = () => {
    const content = document.getElementById('ip_message').value.trim();
    const fileInput = document.getElementById('ip_file');
    const file = fileInput.files[0];

    if (!content && !file) {
        alert('Vui lòng nhập tin nhắn hoặc chọn file!');
        return;
    }

    if (!currentConversationId) {
        alert('Vui lòng chọn bạn hoặc nhóm để chat!');
        return;
    }

    const ulMessage = document.getElementById('ul_message');
    const li = document.createElement('li');
    if (content) {
        li.appendChild(document.createTextNode(`${myUsername}: ${content}`));
    }
    if (file) {
        const tempUrl = URL.createObjectURL(file);
        if (file.type.match(/^image\/(jpg|jpeg|png|gif)$/i)) {
            const img = document.createElement('img');
            img.src = tempUrl;
            img.alt = 'Hình ảnh';
            img.onclick = () => openImageModal(tempUrl);
            li.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = tempUrl;
            link.textContent = file.name || 'Tải file';
            link.download = file.name;
            link.target = '_blank';
            li.appendChild(link);
        }
    }
    li.className = 'right';
    ulMessage.appendChild(li);
    ulMessage.scrollTop = ulMessage.scrollHeight;

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            socket.emit('sendMessage', {
                senderId: myUserId,
                conversationId: currentConversationId,
                content,
                file: e.target.result,
                fileName: file.name
            });
        };
        reader.readAsDataURL(file);
    } else {
        socket.emit('sendMessage', {
            senderId: myUserId,
            conversationId: currentConversationId,
            content
        });
    }

    document.getElementById('ip_message').value = '';
    if (fileInput) fileInput.value = '';
    document.getElementById('selected_file_name').textContent = '';
    document.getElementById('ip_message').focus();
};

const openImageModal = (imageSrc) => {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modal.style.display = 'flex';
    modalImage.src = imageSrc;
};

const displayMessage = (message) => {
    const ulMessage = document.getElementById('ul_message');
    const li = document.createElement('li');
    if (message.content) {
        li.appendChild(document.createTextNode(`${message.sender.full_name}: ${message.content}`));
    }
    if (message.file && !message.isLibraryUpload) {
        if (message.file.match(/^\/Uploads\/.*\.(jpg|jpeg|png|gif)$/i)) {
            const img = document.createElement('img');
            img.src = message.file;
            img.alt = 'Hình ảnh';
            img.onclick = () => openImageModal(message.file);
            li.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = message.file;
            link.textContent = message.fileName || 'Tải file';
            link.download = message.fileName;
            link.target = '_blank';
            li.appendChild(link);
        }
    }
    li.className = message.sender._id === myUserId ? 'right' : '';
    ulMessage.appendChild(li);
    ulMessage.scrollTop = ulMessage.scrollHeight;
};

// Socket.IO listeners
document.getElementById('ip_file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const selectedFileName = document.getElementById('selected_file_name');
    selectedFileName.textContent = file ? file.name : '';
});

document.getElementById('library_file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const libraryFileName = document.getElementById('library_file_name');
    if (file) {
        libraryFileName.textContent = file.name;
        uploadLibraryFile();
    } else {
        libraryFileName.textContent = '';
    }
});

const modal = document.getElementById('imageModal');
const closeModal = document.getElementById('closeModal');
closeModal.onclick = () => modal.style.display = 'none';
modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

document.getElementById('btn_logout').addEventListener('click', logout);
document.getElementById('btn_search').addEventListener('click', searchUser);
document.getElementById('btn_create_group').addEventListener('click', openGroupModal);
document.getElementById('btn_submit_create_group').addEventListener('click', createGroup);
document.getElementById('btn_add_member').addEventListener('click', openAddMemberModal);
document.getElementById('btn_submit_add_member').addEventListener('click', addMemberToGroup);
document.getElementById('btn_library').addEventListener('click', openLibraryModal);
document.getElementById('btn_media').addEventListener('click', openMediaModal);
document.getElementById('btn_tasks').addEventListener('click', openTasksModal);
document.getElementById('btn_add_task').addEventListener('click', addTask);
document.getElementById('search_tasks').addEventListener('input', searchTasks);
document.getElementById('btn_send').addEventListener('click', sendMessage);
document.getElementById('ip_message').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

socket.on('receiveMessage', (message) => {
    if (message.sender._id !== myUserId) {
        // Hiển thị toast notification
        const toast = document.createElement('div');
        toast.className = 'new-message-toast';
        toast.textContent = message.file
            ? `Tin nhắn mới từ ${message.sender.full_name}: Đã gửi ${message.fileName || 'tệp tin'}`
            : `Tin nhắn mới từ ${message.sender.full_name}: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);

        // Hiển thị tin nhắn nếu đang ở đúng cuộc trò chuyện
        if (message.conversation.toString() === currentConversationId) {
            displayMessage(message);
        }
    }
});

socket.on('receiveGroupMessage', (message) => {
    if (message.sender._id !== myUserId) {
        // Hiển thị toast notification
        const toast = document.createElement('div');
        toast.className = 'new-message-toast';
        toast.textContent = message.file
            ? `Tin nhắn mới trong nhóm từ ${message.sender.full_name}: Đã gửi ${message.fileName || 'tệp tin'}`
            : `Tin nhắn mới trong nhóm từ ${message.sender.full_name}: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);

        // Hiển thị tin nhắn nếu đang ở đúng cuộc trò chuyện
        if (message.conversation.toString() === currentConversationId) {
            displayMessage(message);
        }
    }
});

socket.on('addedToGroup', ({ groupId, groupName }) => {
    alert(`Bạn đã được thêm vào nhóm "${groupName}"`);
    loadGroups();
});

socket.on('newMemberAdded', ({ groupId }) => {
    if (groupId === currentConversationId) {
        alert(`Thành viên mới đã được thêm vào nhóm`);
    }
});

socket.on('newFileAdded', ({ groupId, fileName, sender }) => {
    if (groupId === currentConversationId) {
        alert(`File mới "${fileName}" được gửi bởi ${sender}`);
    }
});

socket.on('taskUpdated', ({ groupId, task, taskId, action }) => {
    if (groupId !== currentConversationId) return;

    const taskList = document.getElementById('task_list');
    const modal = document.getElementById('tasksModal');

    if (modal.style.display !== 'flex') {
        if (action === 'deleted') {
            displayedTaskIds.delete(taskId);
            alert(`Công việc đã được xóa`);
        } else {
            alert(`Công việc "${task.title}" đã được ${action === 'created' ? 'tạo' : 'cập nhật'} bởi ${task.creator.full_name}`);
        }
        return;
    }

    if (action === 'deleted') {
        const taskItem = taskList.querySelector(`li[data-task-id="${taskId}"]`);
        if (taskItem) {
            taskItem.remove();
            displayedTaskIds.delete(taskId);
        }
        if (!taskList.querySelector('li[data-task-id]')) {
            taskList.innerHTML = '<li>Chưa có công việc nào</li>';
        }
        alert(`Công việc đã được xóa`);
    } else {
        if (displayedTaskIds.has(task._id)) {
            const existingTask = taskList.querySelector(`li[data-task-id="${task._id}"]`);
            if (existingTask) {
                const li = document.createElement('li');
                li.dataset.taskId = task._id;
                li.innerHTML = `
                    <input type="checkbox" ${task.isCompleted ? 'checked' : ''} onchange="toggleTaskCompletion('${task._id}', this.checked)">
                    <span class="task-title">${task.title}</span>
                    <span class="task-description">${task.description || ''}</span>
                    <span> - ${task.creator.full_name} - ${new Date(task.createdAt).toLocaleString()}</span>
                    <button class="edit-task" onclick="editTask('${task._id}', '${task.title}', '${task.description || ''}')">Sửa</button>
                    <button class="delete-task" onclick="deleteTask('${task._id}')">Xóa</button>
                `;
                if (task.isCompleted) li.classList.add('completed');
                existingTask.replaceWith(li);
                alert(`Công việc "${task.title}" đã được cập nhật bởi ${task.creator.full_name}`);
            }
        } else {
            displayedTaskIds.add(task._id);
            if (taskList.innerHTML === '<li>Chưa có công việc nào</li>') {
                taskList.innerHTML = '';
            }
            const li = document.createElement('li');
            li.dataset.taskId = task._id;
            li.innerHTML = `
                <input type="checkbox" ${task.isCompleted ? 'checked' : ''} onchange="toggleTaskCompletion('${task._id}', this.checked)">
                <span class="task-title">${task.title}</span>
                <span class="task-description">${task.description || ''}</span>
                <span> - ${task.creator.full_name} - ${new Date(task.createdAt).toLocaleString()}</span>
                <button onclick="editTask('${task._id}', '${task.title}', '${task.description || ''}')">Sửa</button>
                <button onclick="deleteTask('${task._id}')">Xóa</button>
            `;
            if (task.isCompleted) li.classList.add('completed');
            taskList.prepend(li);
            alert(`Công việc "${task.title}" đã được tạo bởi ${task.creator.full_name}`);
        }
    }
});

socket.on('messageCensored', ({ message }) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});



socket.on('reminderAlert', ({ content, time }) => {
    const timeString = new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const toast = document.createElement('div');
    toast.className = 'new-message-toast-nhacnho';
    toast.textContent = `Nhắc nhở: ${content} vào lúc ${timeString}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
});


displayUsername();
loadFriends();
loadFriendRequests();
loadGroups();