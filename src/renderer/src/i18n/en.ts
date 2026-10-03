export const en = {
  app: {
    title: 'Money Folder'
  },
  nav: {
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
    INTERNAL: 'Something went wrong. Details are in the log.'
  }
}

type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> }
/** Shape every locale must match: same keys as English, any strings. */
export type MessageSchema = Messages<typeof en>
