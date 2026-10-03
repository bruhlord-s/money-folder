<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useConfirm } from 'primevue/useconfirm'
import type { AccountDto } from '@shared/accounts'
import { MEMBER_NAME_MAX, memberInputSchema, type FamilyMemberDto } from '@shared/family-members'
import { useApi } from '../composables/use-api'

const { t } = useI18n()
const confirm = useConfirm()
const { call, notifySuccess } = useApi()

const members = ref<FamilyMemberDto[]>([])
const accounts = ref<AccountDto[]>([])
const loading = ref(false)

const accountCounts = computed(() => {
  const counts = new Map<number, number>()
  for (const account of accounts.value) {
    if (account.owner) counts.set(account.owner.id, (counts.get(account.owner.id) ?? 0) + 1)
  }
  return counts
})

async function load(): Promise<void> {
  loading.value = true
  const [memberList, accountList] = await Promise.all([
    call('members:list', null),
    call('accounts:list', { includeArchived: true })
  ])
  members.value = memberList ?? []
  accounts.value = accountList ?? []
  loading.value = false
}

onMounted(load)

// Add / rename dialog
const dialogVisible = ref(false)
const editing = ref<FamilyMemberDto | null>(null)
const name = ref('')
const nameError = ref('')
const saving = ref(false)

function openDialog(member: FamilyMemberDto | null): void {
  editing.value = member
  name.value = member?.name ?? ''
  nameError.value = ''
  dialogVisible.value = true
}

async function save(): Promise<void> {
  const parsed = memberInputSchema.safeParse({ name: name.value })
  if (!parsed.success) {
    nameError.value = t('members.errors.name')
    return
  }
  saving.value = true
  const member = editing.value
  const saved = member
    ? await call('members:rename', { id: member.id, input: parsed.data })
    : await call('members:create', parsed.data)
  saving.value = false
  if (saved) {
    notifySuccess(t(member ? 'members.toast.renamed' : 'members.toast.created'))
    dialogVisible.value = false
  }
  await load()
}

async function remove(member: FamilyMemberDto): Promise<void> {
  if ((await call('members:delete', { id: member.id })) !== undefined) {
    notifySuccess(t('members.toast.deleted'))
  }
  await load()
}

function confirmRemove(member: FamilyMemberDto): void {
  confirm.require({
    header: t('members.deleteConfirm.header'),
    message: t('members.deleteConfirm.message', { name: member.name }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', text: true },
    accept: () => void remove(member)
  })
}
</script>

<template>
  <section>
    <header class="page-header">
      <h1>{{ t('members.title') }}</h1>
      <Button icon="pi pi-plus" :label="t('members.new')" @click="openDialog(null)" />
    </header>

    <DataTable :value="members" :loading="loading" data-key="id">
      <template #empty>
        <span class="muted">{{ t('members.empty') }}</span>
      </template>

      <Column field="name" :header="t('members.columns.name')" />

      <Column :header="t('members.columns.accounts')">
        <template #body="{ data }: { data: FamilyMemberDto }">
          <span :class="{ muted: !accountCounts.get(data.id) }">
            {{ t('members.accountCount', accountCounts.get(data.id) ?? 0) }}
          </span>
        </template>
      </Column>

      <Column class="actions-column">
        <template #body="{ data }: { data: FamilyMemberDto }">
          <div class="row-actions">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              :aria-label="t('members.rename')"
              :title="t('members.rename')"
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

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="editing ? t('members.rename') : t('members.new')"
      :style="{ width: '24rem' }"
    >
      <form id="member-form" novalidate @submit.prevent="save">
        <div class="field">
          <label for="member-name">{{ t('members.fields.name') }}</label>
          <InputText
            id="member-name"
            v-model="name"
            :maxlength="MEMBER_NAME_MAX"
            :invalid="!!nameError"
            autofocus
          />
          <small v-if="nameError" class="field-error">{{ nameError }}</small>
        </div>
      </form>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          text
          @click="dialogVisible = false"
        />
        <Button :label="t('common.save')" type="submit" form="member-form" :loading="saving" />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
:deep(.actions-column) {
  width: 1%;
  white-space: nowrap;
}
</style>
