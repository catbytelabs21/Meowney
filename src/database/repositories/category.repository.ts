import { database } from '@/database/database';
import type { Category, CategoryType } from '@/features/categories/types';

type CategoryRow = {
  id: string;
  notebook_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CategoryInput = {
  color: string | null;
  icon: string | null;
  name: string;
  notebookId: string;
  parentId: string | null;
  type: CategoryType;
};

type DefaultCategory = {
  color: string | null;
  icon: string;
  name: string;
  type: CategoryType;
};

const defaultCategories: DefaultCategory[] = [
  { color: '#7DD8A8', icon: 'briefcase-outline', name: 'Sueldo', type: 'income' },
  { color: '#00B3DD', icon: 'cart-outline', name: 'Venta', type: 'income' },
  { color: '#DD90D8', icon: 'gift-outline', name: 'Regalo', type: 'income' },
  { color: '#847DFF', icon: 'chart-line', name: 'Intereses', type: 'income' },
  { color: '#D1C9FF', icon: 'paw-outline', name: 'Ingreso extra', type: 'income' },
  { color: '#FFB4AB', icon: 'fish', name: 'Comida', type: 'expense' },
  { color: '#90B8F0', icon: 'bus', name: 'Transporte', type: 'expense' },
  { color: '#F1C27D', icon: 'home-outline', name: 'Hogar', type: 'expense' },
  { color: '#CACACA', icon: 'bell-outline', name: 'Servicios', type: 'expense' },
  { color: '#DD90D8', icon: 'heart-pulse', name: 'Salud', type: 'expense' },
  { color: '#847DFF', icon: 'movie-open-outline', name: 'Entretenimiento', type: 'expense' },
  { color: '#00B3DD', icon: 'school-outline', name: 'Educacion', type: 'expense' },
  { color: '#4B49AA', icon: 'cart-outline', name: 'Compras', type: 'expense' },
  { color: '#6A6B6B', icon: 'paw-outline', name: 'Otros gastos', type: 'expense' },
];

const previousDefaultIcons: Record<string, string> = {
  'income:Ingreso extra': 'cash-plus',
  'expense:Comida': 'silverware-fork-knife',
  'expense:Servicios': 'lightning-bolt-outline',
  'expense:Compras': 'shopping-outline',
  'expense:Otros gastos': 'dots-horizontal-circle-outline',
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    notebookId: row.notebook_id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function createId(type: CategoryType) {
  return `category_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const categoryRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<CategoryRow>(
      `
        SELECT *
        FROM category
        WHERE notebook_id = ?
          AND archived_at IS NULL
        ORDER BY type ASC, name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows.map(mapCategory);
  },

  getOrCreateDefault(notebookId: string, type: CategoryType) {
    const name = type === 'income' ? 'Ingreso general' : 'Gasto general';
    const existing = database.getFirstSync<CategoryRow>(
      `
        SELECT *
        FROM category
        WHERE notebook_id = ?
          AND type = ?
          AND name = ?
          AND archived_at IS NULL
        LIMIT 1
      `,
      notebookId,
      type,
      name,
    );

    if (existing) {
      return mapCategory(existing);
    }

    const createdAt = nowIso();
    const category: Category = {
      id: createId(type),
      notebookId,
      name,
      type,
      icon: type === 'income' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline',
      color: null,
      parentId: null,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO category (
          id,
          notebook_id,
          name,
          type,
          icon,
          color,
          parent_id,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL)
      `,
      category.id,
      category.notebookId,
      category.name,
      category.type,
      category.icon,
      category.createdAt,
      category.updatedAt,
    );

    return category;
  },

  create(input: CategoryInput) {
    const createdAt = nowIso();
    const category: Category = {
      id: createId(input.type),
      notebookId: input.notebookId,
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      parentId: input.parentId,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO category (
          id,
          notebook_id,
          name,
          type,
          icon,
          color,
          parent_id,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      category.id,
      category.notebookId,
      category.name,
      category.type,
      category.icon,
      category.color,
      category.parentId,
      category.createdAt,
      category.updatedAt,
    );

    return category;
  },

  update(id: string, input: CategoryInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE category
        SET
          name = ?,
          type = ?,
          icon = ?,
          color = ?,
          parent_id = ?,
          updated_at = ?
        WHERE id = ?
          AND notebook_id = ?
          AND archived_at IS NULL
      `,
      input.name,
      input.type,
      input.icon,
      input.color,
      input.parentId,
      updatedAt,
      id,
      input.notebookId,
    );
  },

  archive(id: string, notebookId: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE category
        SET archived_at = ?, updated_at = ?
        WHERE id = ?
          AND notebook_id = ?
          AND archived_at IS NULL
      `,
      archivedAt,
      archivedAt,
      id,
      notebookId,
    );
  },

  seedDefaultCategories(notebookId: string) {
    defaultCategories.forEach((category) => {
      const existing = database.getFirstSync<CategoryRow>(
        `
          SELECT *
          FROM category
          WHERE notebook_id = ?
            AND type = ?
            AND name = ?
            AND archived_at IS NULL
          LIMIT 1
        `,
        notebookId,
        category.type,
        category.name,
      );

      if (!existing) {
        this.create({
          notebookId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId: null,
        });
        return;
      }

      const previousIcon = previousDefaultIcons[`${category.type}:${category.name}`];

      if (previousIcon && existing.icon === previousIcon) {
        database.runSync(
          `
            UPDATE category
            SET icon = ?, updated_at = ?
            WHERE id = ?
              AND notebook_id = ?
              AND archived_at IS NULL
          `,
          category.icon,
          nowIso(),
          existing.id,
          notebookId,
        );
      }
    });
  },
};
