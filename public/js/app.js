document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const socket = io();
  let currentUser = null;
  const authSection = document.getElementById('auth-section');
  const chatSection = document.getElementById('chat-section');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userRole = document.getElementById('user-role');
  const adminControls = document.querySelector('.admin-controls');
  const clearChatBtn = document.getElementById('clear-chat');
  const onlineUsers = document.getElementById('online-users');
  const avatarUpload = document.getElementById('avatar-upload');

  // Create and append logout button
  const logoutButton = document.createElement('button');
  logoutButton.textContent = 'Sair';
  logoutButton.className = 'btn-logout';
  document.querySelector('.user-info').appendChild(logoutButton);

  // Auth Tab Switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show the corresponding form
      if (tab.dataset.tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      }
    });
  });

  // Check for existing session
  const token = localStorage.getItem('token');
  if (token) {
    fetch('/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      return response.json();
    })
    .then(data => {
      if (data.user) {
        currentUser = data.user;
        initializeChat();
      }
    })
    .catch((error) => {
      console.error('Authentication error:', error);
      localStorage.removeItem('token');
      showAuthSection();
    });
  } else {
    showAuthSection();
  }

  function showAuthSection() {
    authSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
  }

  // Register Handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        initializeChat();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error registering user');
    }
  });

  // Login Handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        initializeChat();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error logging in');
    }
  });

  // Initialize Chat
  // Logout Handler
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    currentUser = null;
    chatSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    chatMessages.innerHTML = '';
    socket.emit('leave');
  });

  // Load Message History
  async function loadMessageHistory() {
    try {
      const response = await fetch('/messages/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const messages = await response.json();
      chatMessages.innerHTML = ''; // Clear existing messages
      messages.reverse().forEach(msg => { // Reverse to show oldest first
        displayMessage(msg);
      });
    } catch (error) {
      console.error('Error loading message history:', error);
    }
  }

  function initializeChat() {
    authSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    userAvatar.src = currentUser.avatar || '/images/default-avatar.png';
    userName.textContent = currentUser.username;
    userRole.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuário';

    if (currentUser.role === 'admin') {
      adminControls.classList.remove('hidden');
    }

    loadMessageHistory();
    socket.emit('join', {
      id: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      role: currentUser.role
    });
  }

  // Send Message
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message && !currentUser.isMuted) {
      socket.emit('message', { message });
      messageInput.value = '';
    } else if (currentUser.isMuted) {
      alert('You are currently muted');
    }
  });

  function displayMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
      <img src="${data.avatar || '/images/default-avatar.png'}" alt="${data.username}" class="message-avatar">
      <div class="message-content">
        <div class="message-header">
          <span class="message-username">${data.username}</span>
          <span class="message-time">${new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-text">${data.message}</div>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Receive Message
  socket.on('message', (data) => {
    displayMessage(data);
  });

  // Avatar Upload Handler
  avatarUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        userAvatar.src = data.user.avatar;
        currentUser.avatar = data.user.avatar;
      } else {
        alert('Error updating avatar: ' + data.message);
      }
    } catch (error) {
      alert('Error uploading avatar');
      console.error('Avatar upload error:', error);
    }
  });

  // Admin Controls
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/admin/clear-chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ room: 'general' })
        });

        if (response.ok) {
          socket.emit('chatCleared', 'general');
        } else {
          const data = await response.json();
          alert(data.message);
        }
      } catch (error) {
        console.error('Error clearing chat:', error);
        alert('Error clearing chat');
      }
    });
  }

  // Socket event for chat cleared
  socket.on('chatCleared', ({ room }) => {
    if (room === 'general') {
      chatMessages.innerHTML = '';
    }
  });

  // User Join/Leave Handlers
  socket.on('userJoined', (userData) => {
    const userItem = document.createElement('li');
    userItem.id = `user-${userData.id}`;
    userItem.innerHTML = `
      <span>${userData.username}</span>
      ${currentUser.role === 'admin' ? `
        ${userData.role !== 'admin' ? `
          <button onclick="muteUser('${userData.id}')">Mute</button>
          <button onclick="unmuteUser('${userData.id}')">Unmute</button>
          <button onclick="banUser('${userData.id}')">Ban</button>
        ` : ''}
      ` : ''}
    `;
    onlineUsers.appendChild(userItem);
  });

  socket.on('userLeft', (userData) => {
    const userItem = document.getElementById(`user-${userData.id}`);
    if (userItem) {
      userItem.remove();
    }
  });

  // Admin Functions
  window.muteUser = async (userId) => {
    try {
      const response = await fetch(`/admin/mute/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        const mutedUser = data.user;
        socket.emit('userMuted', { userId: mutedUser._id, username: mutedUser.username });
        showPopup(`${mutedUser.username} foi mutado por violar as regras da nossa comunidade`, 'info');
      } else {
        showPopup(data.message, 'error');
      }
    } catch (error) {
      showPopup('Error muting user', 'error');
    }
  };

  socket.on('userUnmuted', (data) => {
    if (currentUser && currentUser.id === data.userId) {
      currentUser.isMuted = false;
      messageInput.disabled = false;
      messageInput.placeholder = 'Digite sua mensagem...';
    }
  });

  window.unmuteUser = async (userId) => {
    try {
      const response = await fetch(`/admin/unmute/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        socket.emit('userUnmuted', { userId });
        alert('User unmuted successfully');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error unmuting user');
      console.error('Unmute error:', error);
    }
  };

  window.banUser = async (userId) => {
    try {
      const response = await fetch(`/admin/ban/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert('Error banning user');
    }
  };

  // Socket events for online users
  socket.on('users', (users) => {
    onlineUsers.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.className = 'online-user';
      li.innerHTML = `
        <img src="${user.avatar || '/images/default-avatar.png'}" alt="${user.username}" class="user-avatar-small">
        <span class="user-info-small">
          <span class="username">${user.username}</span>
          <span class="role-badge ${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
        </span>
      `;
      onlineUsers.appendChild(li);
    });
  });

  socket.on('userJoined', (user) => {
    const joinMessage = document.createElement('div');
    joinMessage.className = 'system-message';
    joinMessage.textContent = `${user.username} entrou no chat`;
    chatMessages.appendChild(joinMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  socket.on('userLeft', (user) => {
    const leaveMessage = document.createElement('div');
    leaveMessage.className = 'system-message';
    leaveMessage.textContent = `${user.username} saiu do chat`;
    chatMessages.appendChild(leaveMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  function showPopup(message, type = 'info') {
    const popupContainer = document.getElementById('popup-container');
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    
    const content = document.createElement('div');
    content.className = 'popup-content';
    content.textContent = message;
    
    popup.appendChild(content);
    popupContainer.appendChild(popup);

    setTimeout(() => {
      popup.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        popupContainer.removeChild(popup);
      }, 300);
    }, 3000);
  }

  // Replace alerts with showPopup
  socket.on('error', (data) => {
    showPopup(data.message, 'error');
  });

  socket.on('userMuted', (data) => {
    showPopup(data.message, 'info');
  });

  socket.on('userUnmuted', (data) => {
    if (data.userId === currentUser.id) {
      showPopup('You have been unmuted and can now send messages again.', 'info');
    }
  });
});