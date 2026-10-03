<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { useConfirm } from 'primevue/useconfirm'
import type { TransactionDto } from '@shared/transactions'
import TransactionDialog from '../components/TransactionDialog.vue'
import { useApi } from '../composables/use-api'
import { useFormat } from '../composables/use-format'

const { t } = useI18n()
const confirm = useConfirm()
const { call, notifySuccess } = useApi()
const format = useFormat()

const transactions = ref<TransactionDto[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editing = ref<TransactionDto | null>(null)

async function load(): Promise<void> {
  loading.value = true
  transactions.value = (await call('transactions:list', null)) ?? []
  loading.value = false
}

onMounted(load)

function openDialog(transaction: TransactionDto | null): void {
  editing.value = transaction
  dialogVisible.value = true
}

/** Product names on the receipt, or the note when there are none. */
function details(transaction: TransactionDto): string {
  const names = transaction.lines.flatMap((line) => (line.product ? [line.product.name] : []))
  return names.length > 0 ? names.join(', ') : (transaction.note ?? '')
}

async function remove(transaction: TransactionDto): Promise<void> {
  if ((await call('transactions:delete', { id: transaction.id })) !== undefined) {
    notifySuccess(t('transactions.toast.deleted'))
  }
  await load()
}

function confirmRemove(transaction: TransactionDto): void {
  confirm.require({
    header: t('transactions.deleteConfirm.header'),
    message: t('transactions.deleteConfirm.message', {
      category: transaction.category.name,
      date: format.date(transaction.occurredAt)
    }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', text: true },
    accept: () => void remove(transaction)
  })
}
</script>

<template>
  <section>
    <header class="page-header">
      <h1>{{ t('transactions.title') }}</h1>
      <div class="toolbar">
        <Button icon="pi pi-plus" :label="t('transactions.new')" @click="openDialog(null)" />
      </div>
    </header>

    <DataTable :value="transactions" :loading="loading" data-key="id">
      <template #empty>
        <span class="muted">{{ t('transactions.empty') }}</span>
      </template>

      <Column :header="t('transactions.columns.date')" class="date-column">
        <template #body="{ data }: { data: TransactionDto }">
          {{ format.date(data.occurredAt) }}
        </template>
      </Column>

      <Column field="category.name" :header="t('transactions.columns.category')" />

      <Column field="account.name" :header="t('transactions.columns.account')" />

      <Column :header="t('transactions.columns.details')">
        <template #body="{ data }: { data: TransactionDto }">
          <span class="details">{{ details(data) }}</span>
        </template>
      </Column>

      <Column :header="t('transactions.columns.total')" class="total-column">
        <template #body="{ data }: { data: TransactionDto }">
          {{ format.money(data.total) }}
        </template>
      </Column>

      <Column class="actions-column">
        <template #body="{ data }: { data: TransactionDto }">
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

    <TransactionDialog v-model:visible="dialogVisible" :transaction="editing" @saved="load" />
  </section>
</template>

<style scoped>
.details {
  color: var(--p-surface-600);
}

:deep(.date-column) {
  white-space: nowrap;
}

:deep(.total-column) {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

:deep(.total-column .p-datatable-column-header-content) {
  justify-content: flex-end;
}

:deep(.actions-column) {
  width: 1%;
  white-space: nowrap;
}
</style>
