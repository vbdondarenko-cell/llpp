// ===== LinkUp Supabase Client =====
// Sprint 10: Alpha Testing

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

class LinkUpAPI {
    constructor() {
        this.supabase = window.supabase || null;
        this.user = null;
        this.profile = null;
    }

    // Initialize Supabase client
    async init() {
        if (window.supabase) {
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.user = session.user;
                await this.loadProfile();
            }

            // Listen for auth changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.user = session.user;
                    this.loadProfile();
                } else if (event === 'SIGNED_OUT') {
                    this.user = null;
                    this.profile = null;
                }
            });
        }
    }

    // Load current user profile
    async loadProfile() {
        if (!this.user) return null;
        
        const { data, error } = await this.supabase
            .rpc('get_profile_full', { 
                target_user_id: this.user.id 
            });
        
        if (!error) {
            this.profile = data;
        }
        return data;
    }

    // ===== AUTHENTICATION =====
    
    // Telegram Login
    async telegramLogin(initData) {
        try {
            // Validate Telegram initData
            const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData })
            });
            
            const result = await response.json();
            
            if (result.session) {
                this.supabase.auth.setSession({
                    access_token: result.session.access_token,
                    refresh_token: result.session.refresh_token
                });
                this.user = result.user;
                await this.loadProfile();
            }
            
            return result;
        } catch (error) {
            console.error('Telegram login error:', error);
            return { error };
        }
    }

    // ===== PROFILE =====

    async getProfile(userId = null) {
        const targetId = userId || this.user?.id;
        if (!targetId) return null;

        const { data, error } = await this.supabase
            .rpc('get_profile_full', { target_user_id: targetId });
        
        return { data, error };
    }

    async updateProfile(updates) {
        const { data, error } = await this.supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', this.user.id)
            .select()
            .single();
        
        if (!error) {
            this.profile = { ...this.profile, ...data };
        }
        
        return { data, error };
    }

    // ===== EVENTS =====

    async getEvents(filters = {}) {
        let query = this.supabase
            .from('events')
            .select(`
                *,
                organizer:profiles!organizer_id(id, username, first_name, avatar_url),
                participants:event_participants(count)
            `)
            .eq('status', 'active')
            .order('event_date', { ascending: true });

        if (filters.eventType) {
            query = query.eq('event_type', filters.eventType);
        }

        if (filters.lat && filters.lng) {
            // Geolocation filter would be handled by backend
        }

        const { data, error } = await query;
        return { data: data || [], error };
    }

    async getEvent(eventId) {
        const { data, error } = await this.supabase
            .from('events')
            .select(`
                *,
                organizer:profiles!organizer_id(id, username, first_name, avatar_url),
                participants:event_participants(*)
            `)
            .eq('id', eventId)
            .single();
        
        return { data, error };
    }

    async createEvent(eventData) {
        const { data, error } = await this.supabase
            .from('events')
            .insert({
                ...eventData,
                organizer_id: this.profile?.id
            })
            .select()
            .single();

        if (!error) {
            // Check for achievement
            await this.checkAchievements('event_created');
        }

        return { data, error };
    }

    async joinEvent(eventId) {
        const { data, error } = await this.supabase
            .from('event_participants')
            .insert({
                event_id: eventId,
                user_id: this.profile?.id,
                status: 'approved'
            })
            .select()
            .single();

        return { data, error };
    }

    async requestToJoin(eventId, message = '') {
        const { data, error } = await this.supabase
            .from('event_requests')
            .insert({
                event_id: eventId,
                user_id: this.profile?.id,
                message
            })
            .select()
            .single();

        return { data, error };
    }

    // ===== MESSAGES (CHAT) =====

    async getMessages(eventId, since = null) {
        let query = this.supabase
            .from('messages')
            .select(`
                *,
                sender:profiles!sender_id(id, username, first_name, avatar_url)
            `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });

        if (since) {
            query = query.gt('created_at', since);
        }

        const { data, error } = await query;
        return { data: data || [], error };
    }

    async sendMessage(eventId, content) {
        const { data, error } = await this.supabase
            .rpc('send_message', {
                p_event_id: eventId,
                p_content: content
            });

        if (!error && data?.achievements?.new_achievements?.length > 0) {
            // Handle new achievements
            data.achievements.new_achievements.forEach(achievement => {
                this.showAchievementNotification(achievement);
            });
        }

        return { data, error };
    }

    // Enable realtime for messages
    subscribeToMessages(eventId, callback) {
        return this.supabase
            .channel(`messages:${eventId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `event_id=eq.${eventId}`
            }, callback)
            .subscribe();
    }

    // ===== ACHIEVEMENTS =====

    async getAchievements() {
        const { data, error } = await this.supabase
            .from('achievements')
            .select(`
                *,
                user_achievements(*)
            `);
        
        return { data: data || [], error };
    }

    async checkAchievements(action, value = 1) {
        if (!this.profile?.id) return null;

        const { data, error } = await this.supabase
            .rpc('check_achievements', {
                p_user_id: this.profile.id,
                p_action: action,
                p_value: value
            });

        if (!error && data?.new_achievements?.length > 0) {
            data.new_achievements.forEach(achievement => {
                this.showAchievementNotification(achievement);
            });
        }

        return { data, error };
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification show';
        notification.innerHTML = `
            <div class="achievement-notification-icon">🏆</div>
            <div class="achievement-notification-text">
                <span class="achievement-notification-title">Досягнення!</span>
                <span class="achievement-notification-name">${achievement.name}</span>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ===== PREMIUM =====

    async getPremiumStatus() {
        const { data, error } = await this.supabase
            .from('premiums')
            .select('*')
            .eq('user_id', this.profile?.id)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .single();
        
        return { data, error };
    }

    async purchasePremium(plan, starsAmount) {
        // This would be called from Telegram payment callback
        const expiresAt = this.calculateExpiresAt(plan);
        
        const { data, error } = await this.supabase
            .from('premiums')
            .insert({
                user_id: this.profile?.id,
                plan,
                stars_amount: starsAmount,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (!error) {
            await this.checkAchievements('premium_purchased');
        }

        return { data, error };
    }

    calculateExpiresAt(plan) {
        const now = new Date();
        switch (plan) {
            case 'day': now.setDate(now.getDate() + 1); break;
            case 'week': now.setDate(now.getDate() + 7); break;
            case 'month': now.setMonth(now.getMonth() + 1); break;
            case 'year': now.setFullYear(now.getFullYear() + 1); break;
        }
        return now.toISOString();
    }

    // ===== REQUESTS =====

    async getRequests(eventId = null) {
        let query = this.supabase
            .from('event_requests')
            .select(`
                *,
                user:profiles!user_id(id, username, first_name, avatar_url),
                event:events(id, title)
            `)
            .eq('status', 'pending');

        if (eventId) {
            query = query.eq('event_id', eventId);
        }

        const { data, error } = await query;
        return { data: data || [], error };
    }

    async approveRequest(requestId) {
        const { data: request } = await this.supabase
            .from('event_requests')
            .select('event_id, user_id')
            .eq('id', requestId)
            .single();

        if (!request) return { error: 'Request not found' };

        // Update request status
        await this.supabase
            .from('event_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        // Add to participants
        const { data, error } = await this.supabase
            .from('event_participants')
            .insert({
                event_id: request.event_id,
                user_id: request.user_id,
                status: 'approved'
            })
            .select()
            .single();

        return { data, error };
    }

    async rejectRequest(requestId) {
        const { data, error } = await this.supabase
            .from('event_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single();

        return { data, error };
    }

    // Subscribe to new requests
    subscribeToRequests(eventId, callback) {
        return this.supabase
            .channel(`requests:${eventId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'event_requests',
                filter: `event_id=eq.${eventId}`
            }, callback)
            .subscribe();
    }

    // ===== REPORTS =====

    async createReport(reportData) {
        const { data, error } = await this.supabase
            .from('reports')
            .insert({
                ...reportData,
                reporter_id: this.profile?.id
            })
            .select()
            .single();

        return { data, error };
    }

    // ===== SETTINGS =====

    async getSettings() {
        const { data, error } = await this.supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', this.user?.id)
            .single();
        
        return { data: data || { language: 'uk', theme: 'dark', notifications_enabled: true }, error };
    }

    async updateSettings(updates) {
        const { data, error } = await this.supabase
            .from('user_settings')
            .upsert({
                ...updates,
                user_id: this.user?.id
            })
            .select()
            .single();

        return { data, error };
    }

    // ===== REALTIME SETUP =====

    setupRealtime() {
        // Profile changes
        this.supabase
            .channel('profile-changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `user_id=eq.${this.user?.id}`
            }, (payload) => {
                this.profile = { ...this.profile, ...payload.new };
                this.emit('profileUpdate', this.profile);
            })
            .subscribe();

        // Achievement unlocks
        this.supabase
            .channel('achievement-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'user_achievements'
            }, (payload) => {
                if (payload.new.user_id === this.profile?.id) {
                    this.showAchievementNotification({ name: payload.new.name });
                }
            })
            .subscribe();
    }

    // Simple event emitter
    listeners = {};
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // Cleanup
    async signOut() {
        await this.supabase?.auth.signOut();
        this.user = null;
        this.profile = null;
    }
}

// Create global instance
window.linkup = new LinkUpAPI();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.linkup.init();
});
