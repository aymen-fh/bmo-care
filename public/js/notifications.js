document.addEventListener('DOMContentLoaded', () => {
    // Only init if user is logged in (socket is ready)
    if (typeof io !== 'undefined') {
        const socket = io({
            auth: {
                userId: document.body.dataset.userId // Need to add this to layout
            }
        });

        const notifyBtn = document.getElementById('notificationBtn');
        const notifyDropdown = document.getElementById('notificationDropdown');
        const notifyBadge = document.getElementById('notificationBadge');
        const notifyList = document.getElementById('notificationList');

        // Toggle Dropdown
        if (notifyBtn) {
            notifyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                notifyDropdown.classList.toggle('show');

                // If opening, mark all as read logic can be here or separate
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!notifyDropdown.contains(e.target) && !notifyBtn.contains(e.target)) {
                    notifyDropdown.classList.remove('show');
                }
            });
        }

        // Handle New Notification
        socket.on('new_notification', (data) => {
            // Updated Badge
            if (notifyBadge) {
                const current = parseInt(notifyBadge.innerText) || 0;
                notifyBadge.innerText = current + 1;
                notifyBadge.style.display = 'flex';
                notifyBadge.classList.add('pulse'); // Animation
            }

            // Add to list
            if (notifyList) {
                const item = createNotificationItem(data);
                notifyList.insertBefore(item, notifyList.firstChild);

                // Show toast/popup
                showToast(data.title, data.message, data.type);
            }
        });

        // Helper: Create list item
        function createNotificationItem(n) {
            const li = document.createElement('div');
            li.className = `dropdown-item ${n.read ? '' : 'unread'}`;
            li.innerHTML = `
                <div class="notify-icon ${n.type}">
                    <i class="fas ${getIcon(n.type)}"></i>
                </div>
                <div class="notify-content">
                    <div class="notify-title">${n.title}</div>
                    <div class="notify-msg">${n.message}</div>
                    <div class="notify-time">${new Date(n.createdAt).toLocaleTimeString()}</div>
                </div>
            `;
            return li;
        }

        function getIcon(type) {
            switch (type) {
                case 'success': return 'fa-check-circle';
                case 'warning': return 'fa-exclamation-triangle';
                case 'error': return 'fa-times-circle';
                default: return 'fa-info-circle';
            }
        }
    }
});

// Toast Notification
function showToast(title, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${title}</strong>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}
