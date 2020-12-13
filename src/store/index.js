import { Offerwalls } from "@/_helpers/offerwalls";
import { createStore } from 'vuex'
import { axiosInstance } from '@/_helpers/axios';
import { Roles } from '@/_helpers/roles';
import router from "@/router";

export default createStore({
  state: {
    notifications: [],
    token: localStorage.getItem('token') || null,
    user: localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : null,
    daily_tasks: localStorage.getItem("daily_tasks")
        ? JSON.parse(localStorage.getItem("daily_tasks"))
        : null,
    stats: localStorage.getItem("stats")
        ? JSON.parse(localStorage.getItem("stats"))
        : {
      total_points_earned: 0,
      total_offers_completed: 0,
    },
    offerwalls: Offerwalls,
    announcement_banner: {
      text: '',
      is_enabled: false,
    }
  },
  getters: {
    isLoggedIn: (state) => typeof state.token === "string",
    isUser: (state, getters) => getters.isLoggedIn && state.user,
    isRoleSupplier: (state, getters) => getters.isUser && state.user.role === Roles.Supplier,
    isRoleAdmin: (state, getters) => getters.isUser && state.user.role === Roles.Admin,
    isRoleSuperAdmin: (state, getters) => getters.isUser && state.user.role === Roles.SuperAdmin,
  },
  mutations: {
    pushNotification(state, notification) {
      state.notifications.unshift({
        ...notification,
        id: (Math.random().toString(36) + Date.now().toString(36)).substr(2),
      });
    },

    removeNotification(state, notificationToRemove) {
      state.notifications = state.notifications.filter(notification => notification.id !== notificationToRemove.id);
    },

    setToken(state, { token }) {
      state.token = token;
      localStorage.setItem('token', token);
    },

    removeToken(state) {
      state.token = null;
      localStorage.removeItem('token');
    },

    setUser(state, { user }) {
      state.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },

    removeUser(state) {
      state.user = null;
      localStorage.removeItem('user');
    },

    setStats(state, stats) {
      state.stats = stats;
      localStorage.setItem('stats', JSON.stringify(stats));
    },

    setDailyTasks(state, dailyTasks) {
      state.daily_tasks = dailyTasks;
      localStorage.setItem('daily_tasks', JSON.stringify(dailyTasks));
    },

    updateDailyTasks(state, offers_count) {
      state.daily_tasks.completed_daily_tasks.push(offers_count);
      localStorage.setItem('daily_tasks', JSON.stringify(state.daily_tasks));
    },

    removeDailyTasks(state) {
      state.daily_tasks = null;
      localStorage.removeItem('daily_tasks');
    },

    setAnnouncementBanner(state, announcementBanner) {
      state.announcement_banner = announcementBanner;
    },

    tempEmailVerification(state) {
      state.user.email_verified_at = 1;
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
  actions: {
    addNotification({ commit }, notification) {
      commit('pushNotification', notification);
    },
    removeNotification({ commit }, notification) {
      commit('removeNotification', notification);
    },
    stats({ commit, getters }) {
      if (getters.isLoggedIn) {
        return;
      }

      return axiosInstance.get('stats').then((response) => {
        commit('setStats', response.data);
      });
    },
    login({ commit, getters }, payload) {
      if (getters.isLoggedIn) {
        return;
      }

      return axiosInstance.post('/auth/login', payload).then(response => {
        commit('setUser', response.data);
        commit('setToken', response.data);
      });
    },
    register({ commit, getters }, payload) {
      if (getters.isLoggedIn) {
        return;
      }

      return axiosInstance.post('/auth/register', payload).then(response => {
        commit('setUser', response.data);
        commit('setToken', response.data);
      });
    },
    logout({ commit }) {
      commit('removeUser');
      commit('removeToken');
      commit('removeDailyTasks');
    },
    getLoggedUser({ commit, getters, state }) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.post('/auth/user', state.token).then((response) => {
        commit('setUser', response.data);
      }).catch(() => {
        commit('removeUser');
        commit('removeToken');

        router.push({ name: 'Home' });
      });
    },
    updateUser({ commit, getters, state }, payload) {
      if (! getters.isLoggedIn && (! payload.user_id || ! state.user && ! state.user.id)) {
        return;
      }

      if (payload.user_id) {
        return axiosInstance.put(`/users/${payload.user_id}`, payload);
      }

      return axiosInstance.post(`/users/${state.user.id}`, payload).then((response) => {
          commit('setUser', response.data);
        });
    },
    verifyEmail({ dispatch, commit, getters, state }, token) {
      return axiosInstance.post('/verify', {
        token: token,
      }).then((response) => {
        if (getters.isLoggedIn && state.user && state.user.id === response.data.user.id) {
          commit('setUser', response.data)
        } else {
          dispatch('getLoggedUser');
        }
      });
    },
    resendEmailVerification({ getters, state }) {
      if (! getters.isLoggedIn || ! state.user || state.user && (! state.user.email || state.user.email_verified_at)) {
        return;
      }

      return axiosInstance.post('/resend-verification', {
        email: state.user.email
      });
    },
    getPromoCodes({ getters }, page) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.get(`/coupons?page=${page}`);
    },
    storePromoCode({ getters }, payload) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.post('/coupons', payload);
    },
    updatePromoCode({ getters }, payload) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.put(`/coupons/${payload.promo_code}`, payload);
    },
    deletePromoCode({ getters }, code) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.delete(`/coupons/${code}`);
    },
    redeemPromoCode({ getters, commit }, promoCode) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.post(`/coupons/${promoCode}/redeems`).then((response) => {
        commit('setUser', response.data);
      });
    },
    getDailyTasks({ getters, commit }) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.get('/daily-tasks').then((response) => {
          commit('setDailyTasks', response.data);
      });
    },
    getGiveaway({ getters }) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.get('/giveaway');
    },
    enterGiveaway({ getters, commit }) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.post('/giveaway').then((response) => {
        commit('setUser', response.data);
      });
    },
    storeDailyTasks({ getters, commit }, offers_count) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.post('/daily-tasks', { offers_count }).then((response) => {
          commit('setUser', response.data);
          commit('updateDailyTasks', offers_count);
      });
    },
    getAnnouncementBanner({ getters, commit }) {
      if (! getters.isLoggedIn) {
        return;
      }

      return axiosInstance.get('/announcement-banner').then((response) => {
        if (response.data.announcement_banner) {
          commit('setAnnouncementBanner', response.data.announcement_banner)
        }
      });
    },
    updateAnnouncementBanner({ getters, commit }, payload) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.post('/announcement-banner', payload).then((response) => {
        if (response.data.announcement_banner) {
          commit('setAnnouncementBanner', response.data.announcement_banner)
        }
      });
    },
    getTransactions({ getters, state }) {
      if (! getters.isLoggedIn && ! state.user && ! state.user.id) {
        return;
      }

      return axiosInstance.get(`/users/${state.user.id}/transactions`);
    },
    getActivities({ getters, state }) {
      if (! getters.isLoggedIn && ! state.user && ! state.user.id) {
        return;
      }

      return axiosInstance.get(`/users/${state.user.id}/activities`);
    },
    getReferrals({ getters, state }) {
      if (! getters.isLoggedIn && ! state.user && ! state.user.id) {
        return;
      }

      return axiosInstance.get(`/users/${state.user.id}/referrals`);
    },
    getReferralsStats({ getters, state }) {
      if (! getters.isLoggedIn && ! state.user && ! state.user.id) {
        return;
      }

      return axiosInstance.get(`/users/${state.user.id}/referrals/stats`);
    },
    getUsers({ getters }, payload) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.get(`/users?page=${payload.page}` + (payload.username ? `&username=${payload.username}` : ''));
    },
    banUser({ getters }, payload) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.post(`/users/${payload.user_id}/bans`, { ban_reason: payload.ban_reason });
    },
    unbanUser({ getters }, user_id) {
      if (! getters.isRoleAdmin && ! getters.isRoleSuperAdmin) {
        return;
      }

      return axiosInstance.delete(`/users/${user_id}/bans`);
    },
  },
  modules: {
  },
});
