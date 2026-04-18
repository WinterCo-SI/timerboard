<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

const props = defineProps<{
  open: boolean;
  modelValue: string;
  status: string;
}>();

const { t } = useTranslation();

const emit = defineEmits<{
  close: [];
  updateModelValue: [value: string];
  import: [mode: 'replace' | 'append'];
  resetTimers: [];
  clearTimers: [];
  clearLocalData: [];
}>();

function onInput(event: Event) {
  emit('updateModelValue', (event.target as HTMLTextAreaElement).value);
}

void props;
void t;
void onInput;
</script>

<template>
  <div v-if="props.open" class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">{{ t('import.title') }}</div>
        <button class="tool-btn" title="Close" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-help">{{ t('import.help') }}</div>
        <textarea id="importText" :value="props.modelValue" spellcheck="false" :placeholder="t('import.placeholder')" @input="onInput" />
        <div class="modal-actions">
          <button class="tool-btn" @click="emit('import', 'replace')">{{ t('import.replace') }}</button>
          <button class="tool-btn" @click="emit('import', 'append')">{{ t('import.append') }}</button>
          <button class="tool-btn" @click="emit('resetTimers')">{{ t('import.reset') }}</button>
          <button class="tool-btn" @click="emit('clearTimers')">{{ t('import.clear') }}</button>
          <button class="tool-btn" @click="emit('clearLocalData')">{{ t('import.clearSaved') }}</button>
        </div>
        <div class="modal-foot">{{ props.status }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.62);
}

.modal {
  width: min(820px, 100%);
  max-height: calc(100vh - 36px);
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  overflow: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 13px;
  font-weight: 700;
}

.modal-body {
  padding: 12px 14px;
}

.modal-help {
  font-size: 12px;
  color: var(--text-2);
  margin-bottom: 10px;
}

.mono {
  font-family: var(--font-mono);
}

#importText {
  width: 100%;
  height: 240px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid var(--border-mid);
  background: var(--bg);
  color: var(--text-1);
  padding: 10px;
  font-family: var(--font-mono);
}

.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.modal-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-2);
}
</style>
