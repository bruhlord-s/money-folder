import type { MessageSchema } from './en'

export const ru: MessageSchema = {
  app: {
    title: 'Money Folder'
  },
  nav: {
    transactions: 'Расходы',
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
  transactions: {
    title: 'Расходы',
    new: 'Новый расход',
    edit: 'Изменить расход',
    empty: 'Расходов пока нет. Добавьте первый.',
    itemize: 'Добавить товары',
    singleAmount: 'Одна сумма',
    addLine: 'Добавить строку',
    removeLine: 'Удалить строку',
    total: 'Итого',
    columns: {
      date: 'Дата',
      category: 'Категория',
      account: 'Счёт',
      details: 'Подробности',
      total: 'Сумма'
    },
    fields: {
      date: 'Дата',
      account: 'Счёт',
      category: 'Категория',
      note: 'Заметка',
      amount: 'Сумма',
      product: 'Товар',
      brand: 'Бренд',
      size: 'Объём',
      unit: 'Ед.',
      quantity: 'Кол-во'
    },
    hints: {
      category: 'Например, Такси или Пятёрочка',
      newCategory: 'Создать категорию «{name}»',
      noAccounts: 'Счетов пока нет. Добавьте счёт на странице «Счета».',
      lines: 'Объём — на одну упаковку: молоко 1 л × 3 шт. Для весовых товаров оставьте пустым.'
    },
    errors: {
      accountId: 'Выберите счёт',
      categoryName: 'Введите категорию, до 60 символов',
      amount: 'Введите сумму больше нуля',
      lines: 'Проверьте выделенные строки: сумма и количество должны быть больше нуля',
      note: 'До 200 символов'
    },
    deleteConfirm: {
      header: 'Удалить расход?',
      message: 'Расход «{category}» от {date} будет удалён навсегда.'
    },
    toast: {
      created: 'Расход добавлен',
      updated: 'Расход сохранён',
      deleted: 'Расход удалён'
    }
  },
  units: {
    pcs: 'шт',
    kg: 'кг',
    l: 'л'
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
    IN_USE: 'Запись используется в расходах, поэтому её нельзя удалить. Отправьте её в архив.',
    INTERNAL: 'Что-то пошло не так. Подробности в журнале.'
  }
}
