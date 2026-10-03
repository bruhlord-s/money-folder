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
import type { AccountDto } from '@shared/accounts'
import {
  BRAND_MAX,
  CATEGORY_NAME_MAX,
  KOPECKS,
  MILLI,
  NOTE_MAX,
  PRODUCT_NAME_MAX,
  PRODUCT_UNITS,
  transactionInputSchema,
  type ProductDto,
  type ProductUnit,
  type TransactionDto
} from '@shared/transactions'
import { useApi } from '../composables/use-api'
import { useFormat } from '../composables/use-format'

const props = defineProps<{ transaction: TransactionDto | null }>()
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const { call, notifySuccess } = useApi()
const format = useFormat()

/** Amounts are edited in rubles, quantities and sizes in whole units; converted on save. */
interface LineForm {
  key: number
  name: string
  brand: string
  size: number | null
  unit: ProductUnit
  quantity: number | null
  amount: number | null
}

type Field = 'accountId' | 'categoryName' | 'amount' | 'note' | 'lines'

const form = reactive({
  occurredAt: new Date(),
  accountId: null as number | null,
  categoryName: '',
  note: '',
  /** false: one amount (taxi). true: a table of receipt lines. */
  itemized: false,
  amount: null as number | null,
  lines: [] as LineForm[]
})
const errors = ref<Partial<Record<Field, string>>>({})
/** Keys of lines that failed validation. */
const invalidLines = ref(new Set<number>())
const accounts = ref<AccountDto[]>([])
const categories = ref<string[]>([])
const products = ref<ProductDto[]>([])
const categorySuggestions = ref<string[]>([])
const productSuggestions = ref<ProductDto[]>([])
const saving = ref(false)

let nextKey = 0

const unitOptions = computed(() =>
  PRODUCT_UNITS.map((unit) => ({ value: unit, label: t(`units.${unit}`) }))
)

/** Active accounts, plus the transaction's own account even if it was archived since. */
const accountOptions = computed(() =>
  accounts.value.filter((account) => !account.archived || account.id === form.accountId)
)

const linesTotal = computed(() => form.lines.reduce((sum, line) => sum + toKopecks(line.amount), 0))

function toKopecks(rubles: number | null): number {
  return rubles === null ? 0 : Math.round(rubles * KOPECKS)
}

function toMilli(units: number | null): number {
  return units === null ? 0 : Math.round(units * MILLI)
}

function emptyLine(): LineForm {
  return {
    key: nextKey++,
    name: '',
    brand: '',
    size: null,
    unit: 'pcs',
    quantity: 1,
    amount: null
  }
}

watch(visible, async (isOpen) => {
  if (!isOpen) return
  const transaction = props.transaction
  errors.value = {}
  invalidLines.value = new Set()
  form.occurredAt = transaction ? new Date(transaction.occurredAt) : startOfToday()
  form.accountId = transaction?.account.id ?? null
  form.categoryName = transaction?.category.name ?? ''
  form.note = transaction?.note ?? ''

  const lines = transaction?.lines ?? []
  // The single-amount form can only show one line without a product and with quantity 1.
  form.itemized =
    lines.length > 1 || lines.some((line) => line.product !== null || line.quantity !== MILLI)
  form.amount = form.itemized || !lines[0] ? null : lines[0].amount / KOPECKS
  form.lines = form.itemized
    ? lines.map((line) => ({
        key: nextKey++,
        name: line.product?.name ?? '',
        brand: line.product?.brand ?? '',
        size: line.product?.size == null ? null : line.product.size / MILLI,
        unit: line.product?.unit ?? 'pcs',
        quantity: line.quantity / MILLI,
        amount: line.amount / KOPECKS
      }))
    : []

  const [accountList, categoryList, productList] = await Promise.all([
    call('accounts:list', { includeArchived: true }),
    call('categories:list', null),
    call('products:list', null)
  ])
  accounts.value = accountList ?? []
  categories.value = categoryList?.map((category) => category.name) ?? []
  products.value = productList ?? []
  form.accountId ??= accountOptions.value[0]?.id ?? null
})

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/** Existing categories that match, then the typed text itself so a new category can be created. */
function suggestCategories(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim()
  const matches = categories.value.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  )
  const exists = categories.value.some((name) => sameName(name, query))
  categorySuggestions.value = query && !exists ? [...matches, query] : matches
}

function isNewCategory(name: string): boolean {
  return !categories.value.some((category) => sameName(category, name))
}

function suggestProducts(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim().toLowerCase()
  productSuggestions.value = products.value.filter((product) =>
    format.product(product).toLowerCase().includes(query)
  )
}

/** Typing sets the name; picking a saved product fills brand, size and unit too. */
function onProductInput(line: LineForm, value: string | ProductDto | null): void {
  if (value === null || typeof value === 'string') {
    line.name = value ?? ''
    return
  }
  line.name = value.name
  line.brand = value.brand ?? ''
  line.size = value.size === null ? null : value.size / MILLI
  line.unit = value.unit
}

function itemize(): void {
  form.itemized = true
  form.lines = [{ ...emptyLine(), amount: form.amount }]
}

function useSingleAmount(): void {
  form.itemized = false
  form.amount = form.lines[0]?.amount ?? null
  form.lines = []
}

function removeLine(key: number): void {
  form.lines = form.lines.filter((line) => line.key !== key)
  if (form.lines.length === 0) useSingleAmount()
}

function buildLines(): unknown[] {
  if (!form.itemized) {
    return [{ product: null, quantity: MILLI, amount: toKopecks(form.amount) }]
  }
  return form.lines.map((line) => ({
    // A line without a name has no product, like a bag fee.
    product: line.name.trim()
      ? {
          name: line.name,
          brand: line.brand,
          size: line.size === null ? null : toMilli(line.size),
          unit: line.unit
        }
      : null,
    quantity: toMilli(line.quantity),
    amount: toKopecks(line.amount)
  }))
}

async function save(): Promise<void> {
  const parsed = transactionInputSchema.safeParse({
    accountId: form.accountId,
    categoryName: form.categoryName,
    occurredAt: form.occurredAt.getTime(),
    note: form.note,
    lines: buildLines()
  })
  if (!parsed.success) {
    errors.value = {}
    invalidLines.value = new Set()
    for (const issue of parsed.error.issues) {
      const [field, index] = issue.path
      if (field !== 'lines') {
        errors.value[field as Field] = t(`transactions.errors.${field as Field}`)
      } else if (!form.itemized) {
        errors.value.amount = t('transactions.errors.amount')
      } else {
        errors.value.lines = t('transactions.errors.lines')
        const line = typeof index === 'number' ? form.lines[index] : undefined
        if (line) invalidLines.value.add(line.key)
      }
    }
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
    :style="{ width: form.itemized ? '64rem' : '30rem' }"
  >
    <form id="transaction-form" novalidate @submit.prevent="save">
      <div class="row">
        <div class="field">
          <label for="transaction-date">{{ t('transactions.fields.date') }}</label>
          <DatePicker
            v-model="form.occurredAt"
            input-id="transaction-date"
            :date-format="locale === 'ru' ? 'dd.mm.yy' : 'mm/dd/yy'"
            show-icon
            icon-display="input"
            :manual-input="false"
          />
        </div>

        <div class="field grow">
          <label for="transaction-account">{{ t('transactions.fields.account') }}</label>
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
      </div>

      <div class="field">
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
        <small v-else>{{ t('transactions.hints.category') }}</small>
      </div>

      <div v-if="!form.itemized" class="field">
        <label for="transaction-amount">{{ t('transactions.fields.amount') }}</label>
        <div class="amount-row">
          <InputNumber
            v-model="form.amount"
            input-id="transaction-amount"
            mode="currency"
            currency="RUB"
            currency-display="narrowSymbol"
            :locale="locale"
            :min="0"
            :invalid="!!errors.amount"
          />
          <Button
            :label="t('transactions.itemize')"
            icon="pi pi-list"
            severity="secondary"
            text
            @click="itemize"
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
                  @update:model-value="onProductInput(line, $event)"
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
                  currency="RUB"
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
                  @click="removeLine(line.key)"
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
              @click="useSingleAmount"
            />
          </div>
          <strong class="total">
            {{ t('transactions.total') }}: {{ format.money(linesTotal) }}
          </strong>
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
.row {
  display: flex;
  gap: 1rem;
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
