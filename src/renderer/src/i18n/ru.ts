import type { MessageSchema } from './en'

export const ru: MessageSchema = {
  app: {
    title: 'Money Folder'
  },
  nav: {
    transactions: 'Операции',
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
    title: 'Операции',
    new: 'Новая операция',
    edit: 'Изменить операцию',
    empty: 'Операций пока нет. Добавьте первую.',
    itemize: 'Добавить товары',
    singleAmount: 'Одна сумма',
    addLine: 'Добавить строку',
    removeLine: 'Удалить строку',
    total: 'Итого',
    kinds: {
      expense: 'Расход',
      income: 'Доход',
      transfer: 'Перевод'
    },
    columns: {
      date: 'Дата',
      category: 'Категория',
      account: 'Счёт',
      details: 'Подробности',
      total: 'Сумма'
    },
    fields: {
      kind: 'Тип',
      date: 'Дата',
      account: 'Счёт',
      fromAccount: 'Со счёта',
      toAccount: 'На счёт',
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
      incomeCategory: 'Например, Зарплата или Подарки',
      newCategory: 'Создать категорию «{name}»',
      noAccounts: 'Счетов пока нет. Добавьте счёт на странице «Счета».',
      lines: 'Объём — на одну упаковку: молоко 1 л × 3 шт. Для весовых товаров оставьте пустым.'
    },
    errors: {
      accountId: 'Выберите счёт',
      toAccountId: 'Выберите другой счёт',
      categoryName: 'Введите категорию, до 60 символов',
      amount: 'Введите сумму больше нуля',
      lines: 'Проверьте выделенные строки: сумма и количество должны быть больше нуля',
      note: 'До 200 символов'
    },
    deleteConfirm: {
      header: 'Удалить операцию?',
      message: 'Операция «{what}» от {date} будет удалена навсегда.'
    },
    toast: {
      created: 'Операция добавлена',
      updated: 'Операция сохранена',
      deleted: 'Операция удалена'
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
    IN_USE: 'Запись используется в операциях, поэтому её нельзя удалить. Отправьте её в архив.',
    ARCHIVED: 'Этот счёт в архиве. Восстановите его на странице «Счета», чтобы им пользоваться.',
    INTERNAL: 'Что-то пошло не так. Подробности в журнале.'
  }
}
