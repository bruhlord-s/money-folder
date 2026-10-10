<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import type { AccountDto } from '@shared/accounts'
import { nameKey } from '@shared/common'
import {
  BRAND_MAX,
  CATEGORY_KINDS,
  CATEGORY_NAME_MAX,
  CURRENCY,
  NOTE_MAX,
  PRODUCT_NAME_MAX,
  PRODUCT_UNITS,
  TRANSACTION_KINDS,
  transactionInputSchema,
  type CategoryKind,
  type ProductDto,
  type TransactionDto
} from '@shared/transactions'
import { useApi } from '../composables/use-api'
import { useFormat } from '../composables/use-format'
import {
  applyProduct,
  emptyLine,
  formErrors,
  formFromTransaction,
  itemize,
  linesTotal,
  removeLine,
  switchToSingleAmount,
  toInput,
  type FormField,
  type TransactionForm
} from '../transaction-form'

const props = defineProps<{ transaction: TransactionDto | null }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const { call, notifySuccess } = useApi()
const format = useFormat()

const form = reactive<TransactionForm>(formFromTransaction(null, new Date()))
const errors = ref<Partial<Record<FormField, string>>>({})
/** Keys of lines that failed validation. */
const invalidLines = ref(new Set<number>())
const accounts = ref<AccountDto[]>([])
const categoriesByKind = ref<Record<CategoryKind, string[]>>({ expense: [], income: [] })
const products = ref<ProductDto[]>([])
const categorySuggestions = ref<string[]>([])
const productSuggestions = ref<ProductDto[]>([])
const saving = ref(false)

const kindOptions = computed(() =>
  TRANSACTION_KINDS.map((kind) => ({ value: kind, label: t(`transactions.kinds.${kind}`) }))
)

/** Category names of the current kind; transfers have none. */
const categories = computed(() =>
  form.kind === 'transfer' ? [] : categoriesByKind.value[form.kind]
)

const unitOptions = computed(() =>
  PRODUCT_UNITS.map((unit) => ({ value: unit, label: t(`units.${unit}`) }))
)

/** Active accounts, plus the transaction's own accounts even if they were archived since. */
const accountOptions = computed(() =>
  accounts.value.filter(
    (account) =>
      !account.archived || account.id === form.accountId || account.id === form.toAccountId
  )
)

const dialogWidth = computed(() => {
  if (form.itemized) return '64rem'
  return form.kind === 'transfer' ? '38rem' : '30rem'
})

/** A transfer goes to another account. */
const toAccountOptions = computed(() =>
  accountOptions.value.filter((account) => account.id !== form.accountId)
)

const total = computed(() => linesTotal(form.lines))

watch(visible, async (isOpen) => {
  if (!isOpen) return
  errors.value = {}
  invalidLines.value = new Set()
  Object.assign(form, formFromTransaction(props.transaction, new Date()))

  const [accountList, productList, ...categoryLists] = await Promise.all([
    call('accounts:list', { includeArchived: true }),
    call('products:list', null),
    ...CATEGORY_KINDS.map((kind) => call('categories:list', { kind }))
  ])
  accounts.value = accountList ?? []
  products.value = productList ?? []
  CATEGORY_KINDS.forEach((kind, i) => {
    categoriesByKind.value[kind] = categoryLists[i]?.map((category) => category.name) ?? []
  })
  form.accountId ??= accountOptions.value[0]?.id ?? null
})

/** Receipt lines are for expenses; other kinds go back to a single amount. */
function onKindChange(): void {
  errors.value = {}
  invalidLines.value = new Set()
  if (form.kind !== 'expense' && form.itemized) switchToSingleAmount(form)
}

/** Existing categories that match, then the typed text itself so a new category can be created. */
function suggestCategories(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim()
  const matches = categories.value.filter((name) => nameKey(name).includes(nameKey(query)))
  const exists = categories.value.some((name) => nameKey(name) === nameKey(query))
  categorySuggestions.value = query && !exists ? [...matches, query] : matches
}

function isNewCategory(name: string): boolean {
  return !categories.value.some((category) => nameKey(category) === nameKey(name))
}

function suggestProducts(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim().toLowerCase()
  productSuggestions.value = products.value.filter((product) =>
    format.product(product).toLowerCase().includes(query)
  )
}

async function save(): Promise<void> {
  const parsed = transactionInputSchema.safeParse(toInput(form))
  if (!parsed.success) {
    const { fields, lineKeys } = formErrors(parsed.error.issues, form)
    errors.value = Object.fromEntries(
      [...fields].map((field) => [field, t(`transactions.errors.${field}`)])
    )
    invalidLines.value = lineKeys
    return
  }

  saving.value = true
  const transaction = props.transaction
  const saved = transaction
    ? await call('transactions:update', { id: transaction.id, input: parsed.data })
    : await call('transactions:create', parsed.data)
  saving.value = false
  if (!saved) {
    // The transaction or its account may have been deleted elsewhere; let the page refresh.
    emit('saved')
    return
  }
  notifySuccess(t(transaction ? 'transactions.toast.updated' : 'transactions.toast.created'))
  visible.value = false
  emit('saved')
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="transaction ? t('transactions.edit') : t('transactions.new')"
    :style="{ width: dialogWidth }"
  >
    <form id="transaction-form" novalidate @submit.prevent="save">
      <SelectButton
        v-model="form.kind"
        class="kind"
        :options="kindOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        :aria-label="t('transactions.fields.kind')"
        @change="onKindChange"
      />

      <div class="row">
        <div class="field date-field">
          <label for="transaction-date">{{ t('transactions.fields.date') }}</label>
          <DatePicker
            v-model="form.occurredAt"
            input-id="transaction-date"
            fluid
            :date-format="locale === 'ru' ? 'dd.mm.yy' : 'mm/dd/yy'"
            show-icon
            icon-display="input"
            :manual-input="false"
          />
        </div>

        <div class="field grow">
          <label for="transaction-account">
            {{
              t(
                form.kind === 'transfer'
                  ? 'transactions.fields.fromAccount'
                  : 'transactions.fields.account'
              )
            }}
          </label>
          <Select
            v-model="form.accountId"
            input-id="transaction-account"
            :options="accountOptions"
            option-label="name"
            option-value="id"
            :empty-message="t('transactions.hints.noAccounts')"
            :invalid="!!errors.accountId"
          />
          <small v-if="errors.accountId" class="field-error">{{ errors.accountId }}</small>
        </div>

        <div v-if="form.kind === 'transfer'" class="field grow">
          <label for="transaction-to-account">{{ t('transactions.fields.toAccount') }}</label>
          <Select
            v-model="form.toAccountId"
            input-id="transaction-to-account"
            :options="toAccountOptions"
            option-label="name"
            option-value="id"
            :empty-message="t('transactions.hints.noAccounts')"
            :invalid="!!errors.toAccountId"
          />
          <small v-if="errors.toAccountId" class="field-error">{{ errors.toAccountId }}</small>
        </div>
      </div>

      <div v-if="form.kind !== 'transfer'" class="field">
        <label for="transaction-category">{{ t('transactions.fields.category') }}</label>
        <AutoComplete
          v-model="form.categoryName"
          input-id="transaction-category"
          fluid
          dropdown
          :maxlength="CATEGORY_NAME_MAX"
          :suggestions="categorySuggestions"
          auto-option-focus
          :invalid="!!errors.categoryName"
          @complete="suggestCategories"
        >
          <template #option="{ option }">
            <span v-if="isNewCategory(option)">
              <i class="pi pi-plus" aria-hidden="true" />
              {{ t('transactions.hints.newCategory', { name: option }) }}
            </span>
            <span v-else>{{ option }}</span>
          </template>
        </AutoComplete>
        <small v-if="errors.categoryName" class="field-error">{{ errors.categoryName }}</small>
        <small v-else>
          {{
            t(
              form.kind === 'income'
                ? 'transactions.hints.incomeCategory'
                : 'transactions.hints.category'
            )
          }}
        </small>
      </div>

      <div v-if="!form.itemized" class="field">
        <label for="transaction-amount">{{ t('transactions.fields.amount') }}</label>
        <div class="amount-row">
          <InputNumber
            v-model="form.amount"
            input-id="transaction-amount"
            mode="currency"
            :currency="CURRENCY"
            currency-display="narrowSymbol"
            :locale="locale"
            :min="0"
            :invalid="!!errors.amount"
          />
          <Button
            v-if="form.kind === 'expense'"
            :label="t('transactions.itemize')"
            icon="pi pi-list"
            severity="secondary"
            text
            @click="itemize(form)"
          />
        </div>
        <small v-if="errors.amount" class="field-error">{{ errors.amount }}</small>
      </div>

      <div v-else class="field">
        <table class="lines">
          <thead>
            <tr>
              <th class="col-product">{{ t('transactions.fields.product') }}</th>
              <th class="col-brand">{{ t('transactions.fields.brand') }}</th>
              <th class="col-size">{{ t('transactions.fields.size') }}</th>
              <th class="col-unit">{{ t('transactions.fields.unit') }}</th>
              <th class="col-quantity">{{ t('transactions.fields.quantity') }}</th>
              <th class="col-amount">{{ t('transactions.fields.amount') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="line in form.lines"
              :key="line.key"
              :class="{ 'line-invalid': invalidLines.has(line.key) }"
            >
              <td>
                <AutoComplete
                  :model-value="line.name"
                  fluid
                  :maxlength="PRODUCT_NAME_MAX"
                  :suggestions="productSuggestions"
                  :option-label="format.product"
                  :aria-label="t('transactions.fields.product')"
                  @update:model-value="applyProduct(line, $event)"
                  @complete="suggestProducts"
                />
              </td>
              <td>
                <InputText
                  v-model="line.brand"
                  fluid
                  :maxlength="BRAND_MAX"
                  :aria-label="t('transactions.fields.brand')"
                />
              </td>
              <td>
                <InputNumber
                  v-model="line.size"
                  fluid
                  :min="0"
                  :max-fraction-digits="3"
                  :locale="locale"
                  :aria-label="t('transactions.fields.size')"
                />
              </td>
              <td>
                <Select
                  v-model="line.unit"
                  fluid
                  :options="unitOptions"
                  option-label="label"
                  option-value="value"
                  :aria-label="t('transactions.fields.unit')"
                />
              </td>
              <td>
                <InputNumber
                  v-model="line.quantity"
                  fluid
                  :min="0"
                  :max-fraction-digits="3"
                  :locale="locale"
                  :aria-label="t('transactions.fields.quantity')"
                />
              </td>
              <td>
                <InputNumber
                  v-model="line.amount"
                  fluid
                  mode="currency"
                  :currency="CURRENCY"
                  currency-display="narrowSymbol"
                  :locale="locale"
                  :min="0"
                  :aria-label="t('transactions.fields.amount')"
                />
              </td>
              <td>
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  severity="secondary"
                  :aria-label="t('transactions.removeLine')"
                  :title="t('transactions.removeLine')"
                  @click="removeLine(form, line.key)"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <small v-if="errors.lines" class="field-error">{{ errors.lines }}</small>
        <small v-else>{{ t('transactions.hints.lines') }}</small>
        <div class="lines-footer">
          <div>
            <Button
              :label="t('transactions.addLine')"
              icon="pi pi-plus"
              severity="secondary"
              text
              @click="form.lines.push(emptyLine())"
            />
            <Button
              v-if="form.lines.length <= 1"
              :label="t('transactions.singleAmount')"
              severity="secondary"
              text
              @click="switchToSingleAmount(form)"
            />
          </div>
          <strong class="total"> {{ t('transactions.total') }}: {{ format.money(total) }} </strong>
        </div>
      </div>

      <div class="field">
        <label for="transaction-note">{{ t('transactions.fields.note') }}</label>
        <InputText
          id="transaction-note"
          v-model="form.note"
          :maxlength="NOTE_MAX"
          :invalid="!!errors.note"
        />
        <small v-if="errors.note" class="field-error">{{ errors.note }}</small>
      </div>
    </form>

    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button :label="t('common.save')" type="submit" form="transaction-form" :loading="saving" />
    </template>
  </Dialog>
</template>

<style scoped>
.kind {
  margin-bottom: 1rem;
}

.row {
  display: flex;
  gap: 1rem;
}

.date-field {
  flex: 0 0 11rem;
}

.grow {
  flex: 1;
  min-width: 0;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lines {
  width: 100%;
  border-collapse: collapse;
}

.lines th {
  padding: 0 0.25rem 0.25rem;
  font-weight: 500;
  text-align: left;
}

.lines td {
  padding: 0.2rem 0.25rem;
}

.col-product {
  width: 30%;
}

.col-brand {
  width: 18%;
}

.col-size,
.col-quantity {
  width: 9%;
}

.col-unit {
  width: 9%;
}

.col-amount {
  width: 15%;
}

.line-invalid td {
  background: var(--p-red-50);
}

.lines-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.total {
  font-variant-numeric: tabular-nums;
}
</style>
