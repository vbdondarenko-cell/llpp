// ===== LinkUp Telegram Mini App =====

document.addEventListener('DOMContentLoaded', () => {
    // Splash Screen
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        const mainApp = document.getElementById('main-app');
        
        splashScreen.classList.add('fade-out');
        
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
        }, 500);
    }, 2000);

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            
            // Update nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update views
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
        });
    });

    // Settings Button
    document.getElementById('settings-btn').addEventListener('click', () => {
        const settingsView = document.getElementById('settings-view');
        views.forEach(view => view.classList.remove('active'));
        settingsView.classList.add('active');
        
        navItems.forEach(nav => nav.classList.remove('active'));
    });

    // Settings Back Button
    document.getElementById('settings-back-btn').addEventListener('click', () => {
        const mapView = document.getElementById('map-view');
        views.forEach(view => view.classList.remove('active'));
        mapView.classList.add('active');
        
        const profileNav = document.querySelector('[data-view="map-view"]');
        navItems.forEach(nav => nav.classList.remove('active'));
        profileNav.classList.add('active');
    });

    // Filter Chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // Event Type Buttons
    const eventTypeBtns = document.querySelectorAll('.event-type-btn');
    eventTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            eventTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Participants Counter
    const participantCount = document.getElementById('participant-count');
    const participantsRange = document.getElementById('participants-range');
    const decreaseBtn = document.getElementById('decrease-participants');
    const increaseBtn = document.getElementById('increase-participants');

    const updateParticipants = (value) => {
        participantCount.textContent = value;
        participantsRange.value = value;
    };

    decreaseBtn.addEventListener('click', () => {
        const current = parseInt(participantCount.textContent);
        if (current > 2) {
            updateParticipants(current - 1);
        }
    });

    increaseBtn.addEventListener('click', () => {
        const current = parseInt(participantCount.textContent);
        if (current < 50) {
            updateParticipants(current + 1);
        }
    });

    participantsRange.addEventListener('input', (e) => {
        participantCount.textContent = e.target.value;
    });

    // Create View Back Button
    document.querySelector('#create-view .back-btn').addEventListener('click', () => {
        const mapView = document.getElementById('map-view');
        views.forEach(view => view.classList.remove('active'));
        mapView.classList.add('active');
        
        const mapNav = document.querySelector('[data-view="map-view"]');
        navItems.forEach(nav => nav.classList.remove('active'));
        mapNav.classList.add('active');
    });

    // Chat Tabs
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            chatTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Modal Handling
    const modals = document.querySelectorAll('.modal');
    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
    const closeButtons = document.querySelectorAll('.modal-close');

    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = (modal) => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    modalBackdrops.forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            modals.forEach(modal => closeModal(modal));
        });
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(modal => closeModal(modal));
        });
    });

    // Premium Button
    const premiumBtns = document.querySelectorAll('.premium-btn');
    premiumBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            openModal('premium-modal');
        });
    });

    // Premium Plan Selection
    const planBtns = document.querySelectorAll('.plan-btn');
    planBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            planBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Wallet Button
    const walletBtn = document.getElementById('wallet-btn');
    walletBtn.addEventListener('click', () => {
        openModal('wallet-modal');
    });

    // Language Modal Triggers
    const languageTriggers = [
        document.getElementById('profile-language-btn'),
        document.getElementById('language-settings-btn')
    ];

    languageTriggers.forEach(trigger => {
        if (trigger) {
            trigger.addEventListener('click', () => {
                openModal('language-modal');
            });
        }
    });

    // Language Selection
    const languageItems = document.querySelectorAll('.language-item');
    languageItems.forEach(item => {
        item.addEventListener('click', () => {
            languageItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    // Theme Modal Triggers
    const themeTriggers = [
        document.getElementById('profile-theme-btn'),
        document.getElementById('theme-settings-btn')
    ];

    themeTriggers.forEach(trigger => {
        if (trigger) {
            trigger.addEventListener('click', () => {
                openModal('theme-modal');
            });
        }
    });

    // Theme Selection
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            themeOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            
            const theme = option.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
        });
    });

    // Update current time in status bar
    const updateTime = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeElement = document.querySelector('.time');
        if (timeElement) {
            timeElement.textContent = `${hours}:${minutes}`;
        }
    };

    updateTime();
    setInterval(updateTime, 1000);

    // Handle swipe gestures for modals
    let touchStartY = 0;
    let touchEndY = 0;

    document.querySelectorAll('.modal-content').forEach(modal => {
        modal.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });

        modal.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            const diff = touchStartY - touchEndY;
            
            if (diff > 100) {
                // Swipe up - close modal
                const modalElement = modal.closest('.modal');
                if (modalElement) {
                    closeModal(modalElement);
                }
            }
        });
    });

    // Bookmark functionality
    const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
    bookmarkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.classList.toggle('bookmarked');
            
            if (btn.classList.contains('bookmarked')) {
                btn.style.background = 'var(--accent-primary)';
            } else {
                btn.style.background = '';
            }
        });
    });

    // Interest tags
    const interestTags = document.querySelectorAll('.interest-tag');
    interestTags.forEach(tag => {
        if (!tag.classList.contains('add-more')) {
            tag.addEventListener('click', () => {
                tag.classList.toggle('selected');
            });
        }
    });

    // Add animation delay for staggered effects
    document.querySelectorAll('.event-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 100}ms`;
    });

    document.querySelectorAll('.achievement').forEach((achievement, index) => {
        achievement.style.animationDelay = `${index * 50}ms`;
    });

    // Achievement System
    const achievements = {
        firstEvent: { unlocked: false, name: 'Перша подія', icon: '🎯' },
        tenEvents: { unlocked: false, name: '10 подій', icon: '🔥' },
        fiftyEvents: { unlocked: false, name: '50 подій', icon: '🚀' },
        hundredEvents: { unlocked: false, name: '100 подій', icon: '👑' },
        firstFriend: { unlocked: false, name: 'Перший друг', icon: '🤝' },
        firstPremium: { unlocked: false, name: 'Перший Premium', icon: '⭐' },
        hundredMessages: { unlocked: false, name: '100 повідомлень', icon: '💬' }
    };

    function updateAchievementProgress() {
        const unlocked = Object.values(achievements).filter(a => a.unlocked).length;
        const total = Object.keys(achievements).length;
        const progressEl = document.querySelector('.achievement-progress');
        if (progressEl) {
            progressEl.textContent = `${unlocked}/${total}`;
        }
    }

    function unlockAchievement(key) {
        if (achievements[key] && !achievements[key].unlocked) {
            achievements[key].unlocked = true;
            const achievementEl = document.querySelector(`.achievement-name`);
            // Trigger achievement notification
            showAchievementNotification(achievements[key]);
            updateAchievementProgress();
        }
    }

    function showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-notification-icon">${achievement.icon}</div>
            <div class="achievement-notification-text">
                <span class="achievement-notification-title">Досягнення!</span>
                <span class="achievement-notification-name">${achievement.name}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // For testing - simulate achievement unlock
    window.unlockAchievement = unlockAchievement;

    // ===== Profile Functions =====
    
    // Edit Profile Modal
    const editProfileBtn = document.querySelector('[data-edit-profile]');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileClose = document.getElementById('edit-profile-close');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            openModal('edit-profile-modal');
        });
    }
    
    if (editProfileClose) {
        editProfileClose.addEventListener('click', () => {
            closeModal(editProfileModal);
        });
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const name = document.getElementById('edit-name').value;
            const username = document.getElementById('edit-username').value;
            const bio = document.getElementById('edit-bio').value;
            const city = document.getElementById('edit-city').value;
            
            // Update profile display
            const profileName = document.querySelector('.profile-name');
            const profileUsername = document.querySelector('.profile-username');
            
            if (profileName) profileName.textContent = name;
            if (profileUsername) profileUsername.textContent = username;
            
            // Show success feedback
            saveProfileBtn.textContent = '✓ Збережено!';
            setTimeout(() => {
                saveProfileBtn.textContent = 'Зберегти зміни';
                closeModal(editProfileModal);
            }, 1000);
        });
    }
    
    // Photo Upload (placeholder functionality)
    const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
    const uploadCoverBtn = document.getElementById('upload-cover-btn');
    
    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', () => {
            // In production: trigger file input
            alert('Завантаження фото буде доступно після інтеграції з Supabase Storage');
        });
    }
    
    if (uploadCoverBtn) {
        uploadCoverBtn.addEventListener('click', () => {
            // In production: trigger file input
            alert('Завантаження cover буде доступно після інтеграції з Supabase Storage');
        });
    }
    
    // Achievements Modal
    const achievementsSection = document.querySelector('.achievements-grid');
    const achievementsModal = document.getElementById('achievements-modal');
    const achievementsClose = document.getElementById('achievements-close');
    
    if (achievementsSection) {
        achievementsSection.addEventListener('click', () => {
            openModal('achievements-modal');
        });
        achievementsSection.style.cursor = 'pointer';
    }
    
    if (achievementsClose) {
        achievementsClose.addEventListener('click', () => {
            closeModal(achievementsModal);
        });
    }
    
    // Update achievements modal progress
    function updateAchievementsModal() {
        const unlocked = Object.values(achievements).filter(a => a.unlocked).length;
        const total = Object.keys(achievements).length;
        const progressValue = document.querySelector('.achievement-progress-value');
        const progressFill = document.querySelector('.achievements-progress-fill');
        
        if (progressValue) progressValue.textContent = `${unlocked}/${total}`;
        if (progressFill) progressFill.style.width = `${(unlocked / total) * 100}%`;
        
        // Update list items
        document.querySelectorAll('.achievement-item').forEach(item => {
            const key = item.dataset.achievement;
            if (achievements[key] && achievements[key].unlocked) {
                item.classList.remove('locked');
                item.classList.add('unlocked');
                item.querySelector('.achievement-item-status').textContent = '✓';
            }
        });
    }
    
    // Menu item - Edit Profile
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const text = item.querySelector('span')?.textContent;
        if (text && text.includes('Редагувати профіль')) {
            item.addEventListener('click', () => {
                openModal('edit-profile-modal');
            });
        }
    });
    
    // Accept/Decline buttons in chat
    document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatItem = btn.closest('.chat-item');
            chatItem.classList.remove('pending');
            chatItem.classList.add('active');
            chatItem.querySelector('.chat-actions').remove();
        });
    });

    document.querySelectorAll('.decline-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatItem = btn.closest('.chat-item');
            chatItem.style.opacity = '0.5';
            setTimeout(() => {
                chatItem.remove();
            }, 300);
        });
    });

    // Console info for developers
    console.log('%c🔗 LinkUp', 'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
    console.log('%cTelegram Mini App', 'font-size: 14px; color: #888;');
});
