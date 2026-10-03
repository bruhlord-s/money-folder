<script setup lang="ts">
import { nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import KeyFilter from 'primevue/keyfilter'
import Select from 'primevue/select'
import { ACCOUNT_NAME_MAX, accountInputSchema, type AccountDto } from '@shared/accounts'
import { nameKey } from '@shared/common'
import type { FamilyMemberDto } from '@shared/family-members'
import { useApi } from '../composables/use-api'

const props = defineProps<{ account: AccountDto | null }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const { call, notifySuccess } = useApi()

type Field = 'name' | 'lastFour' | 'tagNames'

const form = reactive({
  name: '',
  lastFour: '',
  ownerId: null as number | null,
  tagNames: [] as string[]
})
const errors = ref<Partial<Record<Field, string>>>({})
const members = ref<FamilyMemberDto[]>([])
const allTags = ref<string[]>([])
const tagSuggestions = ref<string[]>([])
const saving = ref(false)
const lastFourField = useTemplateRef<HTMLElement>('lastFourField')
const tagsField = useTemplateRef<HTMLElement>('tagsField')

const vKeyfilter = KeyFilter

watch(visible, async (isOpen) => {
  if (!isOpen) return
  const account = props.account
  form.name = account?.name ?? ''
  form.lastFour = account?.lastFour ?? ''
  form.ownerId = account?.owner?.id ?? null
  form.tagNames = account?.tags.map((tag) => tag.name) ?? []
  errors.value = {}

  const [memberList, tagList] = await Promise.all([
    call('members:list', null),
    call('tags:list', null)
  ])
  members.value = memberList ?? []
  allTags.value = tagList?.map((tag) => tag.name) ?? []
})

/**
 * v-keyfilter blocks non-digit keys and pastes; this catches the rest (drop, IME). When stripping
 * leaves the model unchanged, Vue doesn't re-render, so put the clean value back into the input.
 */
async function onLastFourInput(value: string | undefined): Promise<void> {
  form.lastFour = (value ?? '').replace(/\D/g, '').slice(0, 4)
  await nextTick()
  const input = lastFourField.value?.querySelector('input')
  if (input && input.value !== form.lastFour) {
    input.value = form.lastFour
  }
}

/**
 * Existing tags that match the query, then the query itself so a new tag can be created.
 * Existing matches come first, so Enter completes "fam" to "family" instead of creating a near-duplicate.
 */
function suggestTags(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim()
  const key = nameKey(query)
  const chosen = new Set(form.tagNames.map(nameKey))
  const matches = allTags.value.filter(
    (name) => nameKey(name).includes(key) && !chosen.has(nameKey(name))
  )
  const exists = allTags.value.some((name) => nameKey(name) === key)
  tagSuggestions.value = query && !exists && !chosen.has(key) ? [...matches, query] : matches
}

function isNewTag(name: string): boolean {
  return !allTags.value.some((tag) => nameKey(tag) === nameKey(name))
}

/** Turns text typed in the tags box but not yet confirmed into a tag. */
function commitTypedTag(): void {
  const input = tagsField.value?.querySelector('input')
  const name = input?.value.trim()
  if (!input || !name) return
  if (!form.tagNames.some((tag) => nameKey(tag) === nameKey(name))) {
    form.tagNames = [...form.tagNames, name]
  }
  input.value = ''
}

/**
 * Enter in the tags field must never submit the form. If AutoComplete didn't pick a suggestion
 * (its input still has text), add the typed text as a tag.
 */
function onTagsEnter(event: KeyboardEvent): void {
  event.preventDefault()
  commitTypedTag()
}

async function save(): Promise<void> {
  commitTypedTag()
  const parsed = accountInputSchema.safeParse({
    name: form.name,
    lastFour: form.lastFour === '' ? null : form.lastFour,
    ownerId: form.ownerId,
    tagNames: form.tagNames
  })
  if (!parsed.success) {
    errors.value = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as Field
      errors.value[field] = t(`accounts.errors.${field}`)
    }
    return
  }

  saving.value = true
  const account = props.account
  const saved = account
    ? await call('accounts:update', { id: account.id, input: parsed.data })
    : await call('accounts:create', parsed.data)
  saving.value = false
  if (!saved) {
    // The account may have been deleted elsewhere; let the page refresh.
    emit('saved')
    return
  }
  notifySuccess(t(account ? 'accounts.toast.updated' : 'accounts.toast.created'))
  visible.value = false
  emit('saved')
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="account ? t('accounts.edit') : t('accounts.new')"
    :style="{ width: '30rem' }"
  >
    <form id="account-form" novalidate @submit.prevent="save">
      <div class="field">
        <label for="account-name">{{ t('accounts.fields.name') }}</label>
        <InputText
          id="account-name"
          v-model="form.name"
          :maxlength="ACCOUNT_NAME_MAX"
          :invalid="!!errors.name"
          autofocus
        />
        <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
      </div>

      <div ref="lastFourField" class="field">
        <label for="account-last-four">{{ t('accounts.fields.lastFour') }}</label>
        <InputText
          id="account-last-four"
          v-keyfilter="/\d/"
          :model-value="form.lastFour"
          inputmode="numeric"
          maxlength="4"
          placeholder="1234"
          class="last-four"
          :invalid="!!errors.lastFour"
          @update:model-value="onLastFourInput"
        />
        <small v-if="errors.lastFour" class="field-error">{{ errors.lastFour }}</small>
        <small v-else>{{ t('accounts.hints.lastFour') }}</small>
      </div>

      <div class="field">
        <label for="account-owner">{{ t('accounts.fields.owner') }}</label>
        <Select
          v-model="form.ownerId"
          input-id="account-owner"
          :options="members"
          option-label="name"
          option-value="id"
          :placeholder="t('accounts.hints.noOwner')"
          :empty-message="t('accounts.hints.noMembers')"
          show-clear
        />
      </div>

      <div ref="tagsField" class="field">
        <label for="account-tags">{{ t('accounts.fields.tags') }}</label>
        <AutoComplete
          v-model="form.tagNames"
          input-id="account-tags"
          multiple
          fluid
          :suggestions="tagSuggestions"
          auto-option-focus
          :invalid="!!errors.tagNames"
          @keydown.enter="onTagsEnter"
          @complete="suggestTags"
        >
          <template #option="{ option }">
            <span v-if="isNewTag(option)">
              <i class="pi pi-plus" aria-hidden="true" />
              {{ t('accounts.hints.newTag', { name: option }) }}
            </span>
            <span v-else>{{ option }}</span>
          </template>
        </AutoComplete>
        <small v-if="errors.tagNames" class="field-error">{{ errors.tagNames }}</small>
        <small v-else>{{ t('accounts.hints.tags') }}</small>
      </div>
    </form>

    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button :label="t('common.save')" type="submit" form="account-form" :loading="saving" />
    </template>
  </Dialog>
</template>

<style scoped>
.last-four {
  width: 8rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2em;
}
</style>
