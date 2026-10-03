export const en = {
  app: {
    title: 'Money Folder'
  },
  nav: {
    transactions: 'Transactions',
    accounts: 'Accounts',
    members: 'Family'
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    none: '—'
  },
  transactions: {
    title: 'Transactions',
    new: 'New transaction',
    edit: 'Edit transaction',
    empty: 'No transactions yet. Add the first one.',
    itemize: 'Add products',
    singleAmount: 'Single amount',
    addLine: 'Add line',
    removeLine: 'Remove line',
    total: 'Total',
    kinds: {
      expense: 'Expense',
      income: 'Income',
      transfer: 'Transfer'
    },
    columns: {
      date: 'Date',
      category: 'Category',
      account: 'Account',
      details: 'Details',
      total: 'Total'
    },
    fields: {
      kind: 'Type',
      date: 'Date',
      account: 'Account',
      fromAccount: 'From account',
      toAccount: 'To account',
      category: 'Category',
      note: 'Note',
      amount: 'Amount',
      product: 'Product',
      brand: 'Brand',
      size: 'Size',
      unit: 'Unit',
      quantity: 'Qty'
    },
    hints: {
      category: 'For example Taxi or Walmart',
      incomeCategory: 'For example Salary or Gifts',
      newCategory: 'Create category "{name}"',
      noAccounts: 'No accounts yet. Add one on the Accounts page.',
      lines: 'Size is per package: milk 1 L × 3 packs. Leave it empty for goods sold by weight.'
    },
    errors: {
      accountId: 'Choose an account',
      toAccountId: 'Choose another account',
      categoryName: 'Enter a category, up to 60 characters',
      amount: 'Enter an amount greater than zero',
      lines: 'Check the highlighted lines: each needs an amount and a quantity greater than zero',
      note: 'Up to 200 characters'
    },
    deleteConfirm: {
      header: 'Delete transaction?',
      message: 'The {what} transaction from {date} will be deleted permanently.'
    },
    toast: {
      created: 'Transaction added',
      updated: 'Transaction saved',
      deleted: 'Transaction deleted'
    }
  },
  units: {
    pcs: 'pcs',
    kg: 'kg',
    l: 'L'
  },
  accounts: {
    title: 'Accounts',
    new: 'New account',
    edit: 'Edit account',
    showArchived: 'Show archived',
    empty: 'No accounts yet. Create the first one.',
    archivedBadge: 'Archived',
    archive: 'Archive',
    unarchive: 'Restore',
    columns: {
      name: 'Name',
      card: 'Card',
      owner: 'Owner',
      tags: 'Tags'
    },
    fields: {
      name: 'Name',
      lastFour: 'Last 4 digits',
      owner: 'Owner',
      tags: 'Tags'
    },
    hints: {
      lastFour: 'Optional, for cards',
      noOwner: 'No owner',
      noMembers: 'No family members yet. Add them on the Family page.',
      tags: 'Type a tag and press Enter',
      newTag: 'Create tag "{name}"'
    },
    errors: {
      name: 'Enter a name, up to 100 characters',
      lastFour: 'Exactly 4 digits, or leave empty',
      tagNames: 'Tags are up to 40 characters, at most 20 per account'
    },
    deleteConfirm: {
      header: 'Delete account?',
      message: 'Account "{name}" will be deleted permanently. Archive it instead to keep it.'
    },
    toast: {
      created: 'Account created',
      updated: 'Account saved',
      archived: 'Account archived',
      unarchived: 'Account restored',
      deleted: 'Account deleted'
    }
  },
  members: {
    title: 'Family members',
    new: 'Add member',
    rename: 'Rename',
    empty: 'No family members yet.',
    accountCount: 'no accounts | {n} account | {n} accounts',
    columns: {
      name: 'Name',
      accounts: 'Accounts'
    },
    fields: {
      name: 'Name'
    },
    errors: {
      name: 'Enter a name, up to 60 characters'
    },
    deleteConfirm: {
      header: 'Delete family member?',
      message: '"{name}" will be deleted. Their accounts will stay, without an owner.'
    },
    toast: {
      created: 'Family member added',
      renamed: 'Family member renamed',
      deleted: 'Family member deleted'
    }
  },
  errors: {
    VALIDATION: 'Some fields are invalid',
    NOT_FOUND: 'It no longer exists. The list was refreshed.',
    CONFLICT: 'This name is already taken',
    IN_USE: 'It is still used by transactions, so it cannot be deleted. Archive it instead.',
    INTERNAL: 'Something went wrong. Details are in the log.'
  }
}

type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> }
/** Shape every locale must match: same keys as English, any strings. */
export type MessageSchema = Messages<typeof en>
