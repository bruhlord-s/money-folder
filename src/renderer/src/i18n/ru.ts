import type { MessageSchema } from './en'

export const ru: MessageSchema = {
  app: {
    title: 'Money Folder'
  },
  nav: {
    accounts: 'Счета',
    members: 'Семья'
  },
  common: {
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Изменить',
    delete: 'Удалить',
    none: '—'
  },
  accounts: {
    title: 'Счета',
    new: 'Новый счёт',
    edit: 'Изменить счёт',
    showArchived: 'Показать архивные',
    empty: 'Счетов пока нет. Создайте первый.',
    archivedBadge: 'В архиве',
    archive: 'В архив',
    unarchive: 'Вернуть из архива',
    columns: {
      name: 'Название',
      card: 'Карта',
      owner: 'Владелец',
      tags: 'Теги'
    },
    fields: {
      name: 'Название',
      lastFour: 'Последние 4 цифры',
      owner: 'Владелец',
      tags: 'Теги'
    },
    hints: {
      lastFour: 'Необязательно, для карт',
      noOwner: 'Без владельца',
      noMembers: 'Членов семьи пока нет. Добавьте их на странице «Семья».',
      tags: 'Введите тег и нажмите Enter',
      newTag: 'Создать тег «{name}»'
    },
    errors: {
      name: 'Введите название, до 100 символов',
      lastFour: 'Ровно 4 цифры или оставьте пустым',
      tagNames: 'Тег — до 40 символов, не больше 20 тегов на счёт'
    },
    deleteConfirm: {
      header: 'Удалить счёт?',
      message: 'Счёт «{name}» будет удалён навсегда. Чтобы сохранить его, отправьте его в архив.'
    },
    toast: {
      created: 'Счёт создан',
      updated: 'Счёт сохранён',
      archived: 'Счёт в архиве',
      unarchived: 'Счёт возвращён из архива',
      deleted: 'Счёт удалён'
    }
  },
  members: {
    title: 'Члены семьи',
    new: 'Добавить',
    rename: 'Переименовать',
    empty: 'Членов семьи пока нет.',
    // Russian plural rule in i18n/index.ts: zero | one | few | many.
    accountCount: 'нет счетов | {n} счёт | {n} счёта | {n} счетов',
    columns: {
      name: 'Имя',
      accounts: 'Счета'
    },
    fields: {
      name: 'Имя'
    },
    errors: {
      name: 'Введите имя, до 60 символов'
    },
    deleteConfirm: {
      header: 'Удалить члена семьи?',
      message: '«{name}» будет удалён(а). Счета останутся, но без владельца.'
    },
    toast: {
      created: 'Член семьи добавлен',
      renamed: 'Имя изменено',
      deleted: 'Член семьи удалён'
    }
  },
  errors: {
    VALIDATION: 'Некоторые поля заполнены неверно',
    NOT_FOUND: 'Запись уже удалена. Список обновлён.',
    CONFLICT: 'Это имя уже занято',
    INTERNAL: 'Что-то пошло не так. Подробности в журнале.'
  }
}
