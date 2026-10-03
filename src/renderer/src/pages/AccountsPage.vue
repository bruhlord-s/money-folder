<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import { useConfirm } from 'primevue/useconfirm'
import type { AccountDto } from '@shared/accounts'
import AccountDialog from '../components/AccountDialog.vue'
import { useApi } from '../composables/use-api'

const { t } = useI18n()
const confirm = useConfirm()
const { call, notifySuccess } = useApi()

const accounts = ref<AccountDto[]>([])
const loading = ref(false)
const showArchived = ref(false)
const dialogVisible = ref(false)
const editing = ref<AccountDto | null>(null)

let latestLoad = 0

/** Reloads the list. Only the most recent call applies its result, so toggling fast can't show a stale list. */
async function load(): Promise<void> {
  const requestId = ++latestLoad
  loading.value = true
  const result = await call('accounts:list', { includeArchived: showArchived.value })
  if (requestId !== latestLoad) return
  accounts.value = result ?? []
  loading.value = false
}

onMounted(load)
watch(showArchived, load)

function openDialog(account: AccountDto | null): void {
  editing.value = account
  dialogVisible.value = true
}

async function toggleArchived(account: AccountDto): Promise<void> {
  const updated = await call('accounts:setArchived', {
    id: account.id,
    archived: !account.archived
  })
  if (updated) {
    notifySuccess(t(updated.archived ? 'accounts.toast.archived' : 'accounts.toast.unarchived'))
  }
  await load()
}

async function remove(account: AccountDto): Promise<void> {
  if ((await call('accounts:delete', { id: account.id })) !== undefined) {
    notifySuccess(t('accounts.toast.deleted'))
  }
  await load()
}

function confirmRemove(account: AccountDto): void {
  confirm.require({
    header: t('accounts.deleteConfirm.header'),
    message: t('accounts.deleteConfirm.message', { name: account.name }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', text: true },
    accept: () => void remove(account)
  })
}

function rowClass(account: AccountDto): string {
  return account.archived ? 'row-archived' : ''
}
</script>

<template>
  <section>
    <header class="page-header">
      <h1>{{ t('accounts.title') }}</h1>
      <div class="toolbar">
        <label class="switch">
          <ToggleSwitch v-model="showArchived" input-id="show-archived" />
          <span>{{ t('accounts.showArchived') }}</span>
        </label>
        <Button icon="pi pi-plus" :label="t('accounts.new')" @click="openDialog(null)" />
      </div>
    </header>

    <DataTable
      :value="accounts"
      :loading="loading"
      data-key="id"
      sort-field="name"
      :sort-order="1"
      :row-class="rowClass"
    >
      <template #empty>
        <span class="muted">{{ t('accounts.empty') }}</span>
      </template>

      <Column field="name" :header="t('accounts.columns.name')" sortable>
        <template #body="{ data }: { data: AccountDto }">
          <span class="account-name">{{ data.name }}</span>
          <Tag
            v-if="data.archived"
            :value="t('accounts.archivedBadge')"
            severity="secondary"
            class="archived-badge"
          />
        </template>
      </Column>

      <Column :header="t('accounts.columns.card')">
        <template #body="{ data }: { data: AccountDto }">
          <span v-if="data.lastFour" class="card-digits">•••• {{ data.lastFour }}</span>
          <span v-else class="muted">{{ t('common.none') }}</span>
        </template>
      </Column>

      <Column field="owner.name" :header="t('accounts.columns.owner')" sortable>
        <template #body="{ data }: { data: AccountDto }">
          <span v-if="data.owner">{{ data.owner.name }}</span>
          <span v-else class="muted">{{ t('common.none') }}</span>
        </template>
      </Column>

      <Column :header="t('accounts.columns.tags')">
        <template #body="{ data }: { data: AccountDto }">
          <div class="tags">
            <Tag v-for="tag in data.tags" :key="tag.id" :value="tag.name" rounded />
          </div>
        </template>
      </Column>

      <Column class="actions-column">
        <template #body="{ data }: { data: AccountDto }">
          <div class="row-actions">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              :aria-label="t('common.edit')"
              :title="t('common.edit')"
              @click="openDialog(data)"
            />
            <Button
              :icon="data.archived ? 'pi pi-replay' : 'pi pi-inbox'"
              text
              rounded
              severity="secondary"
              :aria-label="data.archived ? t('accounts.unarchive') : t('accounts.archive')"
              :title="data.archived ? t('accounts.unarchive') : t('accounts.archive')"
              @click="toggleArchived(data)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              :aria-label="t('common.delete')"
              :title="t('common.delete')"
              @click="confirmRemove(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <AccountDialog v-model:visible="dialogVisible" :account="editing" @saved="load" />
  </section>
</template>

<style scoped>
.switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.archived-badge {
  margin-left: 0.5rem;
}

.card-digits {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

:deep(.row-archived) .account-name {
  color: var(--p-surface-500);
}

:deep(.actions-column) {
  width: 1%;
  white-space: nowrap;
}
</style>
