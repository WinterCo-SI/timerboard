<template>
  <div class="auth-notice">
    <div class="auth-inner">
      <div class="auth-icon">⚠</div>
      <div class="auth-content">
        <div class="auth-title">Authentication required</div>
        <div class="auth-message">Live timers require authentication. Please refresh to reauthenticate.</div>
      </div>
      <div class="auth-actions">
        <button class="tool-btn" @click="reload">Refresh</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const reload = () => window.location.reload();
</script>

<style scoped>
.auth-notice {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  justify-content: center;
  z-index: 9999;
}
.auth-inner {
  width: 100%;
  max-width: 1400px;
  margin: 8px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--red);
  color: var(--text-1);
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}
.auth-icon {
  font-size: 18px;
  color: var(--red);
  flex: 0 0 auto;
}
.auth-content {
  display: flex;
  flex-direction: column;
}
.auth-title {
  font-weight: 700;
  color: var(--text-1);
}
.auth-message {
  font-size: 13px;
  color: var(--text-3);
}
.auth-actions { margin-left: auto; }
.auth-actions .tool-btn { height: 32px; }
</style>
