// ===== LinkUp Admin Panel =====

document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const viewPanels = document.querySelectorAll('.view-panel');
    const viewTitle = document.getElementById('view-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            
            // Update nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update views
            viewPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${viewId}-view`).classList.add('active');
            
            // Update title
            const titles = {
                'dashboard': 'Dashboard',
                'users': 'Users',
                'events': 'Events',
                'chats': 'Chats',
                'premium': 'Premium',
                'reports': 'Reports'
            };
            if (viewTitle) {
                viewTitle.textContent = titles[viewId] || 'Dashboard';
            }
        });
    });

    // Chat item selection
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            chatItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Modal functions
    window.openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    // Modal close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Ban user modal
    window.openBanModal = (userId) => {
        console.log('Opening ban modal for user:', userId);
        openModal('ban-modal');
    };

    // Delete event modal
    window.openDeleteEventModal = (eventId) => {
        console.log('Opening delete modal for event:', eventId);
        openModal('delete-event-modal');
    };

    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.data-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    // Admin stats data (simulated)
    const adminStats = {
        totalUsers: 1234,
        activeToday: 456,
        totalEvents: 789,
        activePremium: 89,
        openReports: 12
    };

    // Update stats (in production, fetch from API)
    function updateStats() {
        // This would be replaced with actual API calls
        console.log('Admin stats:', adminStats);
    }

    // Admin actions logging
    const adminLogs = [];

    function logAdminAction(action, target, details) {
        const log = {
            timestamp: new Date().toISOString(),
            action,
            target,
            details
        };
        adminLogs.push(log);
        console.log('Admin action logged:', log);
        
        // Add to activity list
        addActivityItem(action, target, details);
    }

    function addActivityItem(action, target, details) {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        const icons = {
            ban: 'ban',
            delete: 'delete',
            report: 'report',
            warn: 'warn',
            revoke: 'revoke'
        };

        const iconClass = icons[action] || 'report';
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${iconClass}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
                </svg>
            </div>
            <div class="activity-content">
                <span class="activity-text">${details}</span>
                <span class="activity-time">Щойно</span>
            </div>
        `;

        activityList.insertBefore(item, activityList.firstChild);
    }

    // Ban user action
    document.querySelectorAll('.btn-danger').forEach(btn => {
        if (btn.textContent.includes('Ban') || btn.textContent.includes('Delete')) {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const userName = row?.querySelector('.user-name')?.textContent || 
                                  row?.querySelector('.event-name')?.textContent;
                
                if (userName) {
                    logAdminAction('ban', userName, `Користувача <strong>${userName}</strong> заблоковано`);
                }
            });
        }
    });

    // Initialize
    updateStats();

    // Console branding
    console.log('%c🔗 LinkUp Admin', 'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
    console.log('%cAdmin Panel v1.0', 'font-size: 14px; color: #888;');
});
