import { database } from '@/database/database';
import { createRepositoryId, getCurrentTimestamp } from '@/database/repositories/utils';
import { brandColors } from '@/theme/colors';
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
  children?: string[];
  color: string | null;
  icon: string;
  name: string;
  type: CategoryType;
};

const defaultCategories: DefaultCategory[] = [
  { color: brandColors.silver, icon: 'bell-outline', name: 'Servicios', type: 'expense', children: ['Luz', 'Agua', 'Gas', 'Internet', 'Teléfono'] },
  { color: brandColors.warning, icon: 'home-outline', name: 'Hogar', type: 'expense', children: ['Renta', 'Mantenimiento', 'Limpieza', 'Muebles', 'Reparaciones'] },
  { color: brandColors.error, icon: 'silverware-fork-knife', name: 'Comida', type: 'expense', children: ['Supermercado', 'Restaurantes', 'Comida rápida', 'Cafeterías', 'Delivery'] },
  { color: brandColors.periwinkle, icon: 'bus', name: 'Transporte', type: 'expense', children: ['Gasolina', 'Transporte público', 'Taxi/Uber', 'Estacionamiento', 'Mantenimiento'] },
  { color: brandColors.orchidBloom, icon: 'heart-pulse', name: 'Salud', type: 'expense', children: ['Consultas', 'Medicamentos', 'Estudios', 'Dentista', 'Terapia'] },
  { color: brandColors.paleIris, icon: 'tshirt-crew-outline', name: 'Ropa', type: 'expense', children: ['Ropa', 'Calzado', 'Accesorios', 'Uniformes'] },
  { color: brandColors.irisGleam, icon: 'movie-open-outline', name: 'Entretenimiento', type: 'expense', children: ['Cine', 'Videojuegos', 'Salidas', 'Eventos', 'Hobbies'] },
  { color: brandColors.cyanSignal, icon: 'paw-outline', name: 'Mascotas', type: 'expense', children: ['Alimento', 'Veterinario', 'Medicamentos', 'Accesorios', 'Higiene'] },
  { color: brandColors.deepIris, icon: 'calendar-sync-outline', name: 'Suscripciones', type: 'expense', children: ['Streaming', 'Música', 'Software', 'Aplicaciones', 'Membresías'] },
  { color: brandColors.fog, icon: 'dots-horizontal-circle-outline', name: 'Otros', type: 'expense', children: ['Educación', 'Regalos', 'Trámites', 'Emergencias', 'Otros gastos'] },
  { color: brandColors.success, icon: 'briefcase-outline', name: 'Trabajo', type: 'income', children: ['Sueldo', 'Bonos', 'Comisiones', 'Freelance', 'Horas extra'] },
  { color: brandColors.irisGleam, icon: 'chart-line', name: 'Inversiones', type: 'income', children: ['Intereses', 'Dividendos', 'Rendimientos', 'Ganancias'] },
  { color: brandColors.orchidBloom, icon: 'gift-outline', name: 'Regalos', type: 'income', children: ['Familia', 'Pareja', 'Amigos', 'Donaciones'] },
  { color: brandColors.cyanSignal, icon: 'cart-outline', name: 'Ventas', type: 'income', children: ['Artículos personales', 'Electrónicos', 'Ropa', 'Vehículos', 'Otras ventas'] },
  { color: brandColors.paleIris, icon: 'cash-plus', name: 'Otros', type: 'income', children: ['Reembolsos', 'Cashback', 'Premios', 'Apoyos', 'Otros ingresos'] },
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
  return createRepositoryId(`category_${type}`);
}

function normalizeCategoryName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-MX');
}

function findActiveByNormalizedName(
  notebookId: string,
  type: CategoryType,
  name: string,
  parentId: string | null,
) {
  const rows = database.getAllSync<CategoryRow>(
    `
      SELECT *
      FROM category
      WHERE notebook_id = ?
        AND type = ?
        AND ((? IS NULL AND parent_id IS NULL) OR parent_id = ?)
        AND archived_at IS NULL
      ORDER BY created_at ASC
    `,
    notebookId,
    type,
    parentId,
    parentId,
  );
  const normalizedName = normalizeCategoryName(name);

  return rows
    .map(mapCategory)
    .filter((category) => normalizeCategoryName(category.name) === normalizedName);
}

function chooseCanonicalCategory(categories: Category[], preferredName: string) {
  return (
    categories.find((category) => category.name === preferredName) ??
    categories[0] ??
    null
  );
}

function mergeCategoryReferences(sourceId: string, targetId: string, notebookId: string) {
  const updatedAt = getCurrentTimestamp();

  database.runSync(
    `
      UPDATE "transaction"
      SET category_id = ?, updated_at = ?
      WHERE category_id = ?
    `,
    targetId,
    updatedAt,
    sourceId,
  );
  database.runSync(
    `
      UPDATE budget
      SET category_id = ?, updated_at = ?
      WHERE category_id = ?
    `,
    targetId,
    updatedAt,
    sourceId,
  );
  database.runSync(
    `
      UPDATE subscription
      SET category_id = ?, updated_at = ?
      WHERE category_id = ?
    `,
    targetId,
    updatedAt,
    sourceId,
  );
  database.runSync(
    `
      UPDATE category
      SET parent_id = ?, updated_at = ?
      WHERE parent_id = ?
        AND notebook_id = ?
        AND archived_at IS NULL
    `,
    targetId,
    updatedAt,
    sourceId,
    notebookId,
  );
  database.runSync(
    `
      UPDATE category
      SET archived_at = ?, updated_at = ?
      WHERE id = ?
        AND notebook_id = ?
        AND archived_at IS NULL
    `,
    updatedAt,
    updatedAt,
    sourceId,
    notebookId,
  );
}

function consolidateDefaultCategory(
  notebookId: string,
  type: CategoryType,
  name: string,
  parentId: string | null,
) {
  const matches = findActiveByNormalizedName(notebookId, type, name, parentId);
  const canonical = chooseCanonicalCategory(matches, name);

  if (!canonical) {
    return null;
  }

  matches
    .filter((category) => category.id !== canonical.id)
    .forEach((category) => {
      mergeCategoryReferences(category.id, canonical.id, notebookId);
    });

  if (canonical.name !== name) {
    database.runSync(
      `
        UPDATE category
        SET name = ?, updated_at = ?
        WHERE id = ?
          AND notebook_id = ?
          AND archived_at IS NULL
      `,
      name,
      getCurrentTimestamp(),
      canonical.id,
      notebookId,
    );

    return { ...canonical, name };
  }

  return canonical;
}

export const categoryRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<CategoryRow>(
      `
        SELECT category.*
        FROM category
        LEFT JOIN category parent ON parent.id = category.parent_id
        WHERE category.notebook_id = ?
          AND category.archived_at IS NULL
        ORDER BY
          category.type ASC,
          COALESCE(parent.name, category.name) COLLATE NOCASE ASC,
          category.parent_id IS NOT NULL ASC,
          category.name COLLATE NOCASE ASC
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

    const createdAt = getCurrentTimestamp();
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
    const createdAt = getCurrentTimestamp();
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
    const updatedAt = getCurrentTimestamp();

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
    const archivedAt = getCurrentTimestamp();

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

  findActiveByName(notebookId: string, type: CategoryType, name: string, parentId: string | null) {
    const row = database.getFirstSync<CategoryRow>(
      `
        SELECT *
        FROM category
        WHERE notebook_id = ?
          AND type = ?
          AND name = ?
          AND ((? IS NULL AND parent_id IS NULL) OR parent_id = ?)
          AND archived_at IS NULL
        LIMIT 1
      `,
      notebookId,
      type,
      name,
      parentId,
      parentId,
    );

    return row ? mapCategory(row) : (consolidateDefaultCategory(notebookId, type, name, parentId) ?? null);
  },

  seedDefaultCategories(notebookId: string) {
    defaultCategories.forEach((category) => {
      const parent =
        consolidateDefaultCategory(
          notebookId,
          category.type,
          category.name,
          null,
        ) ??
        this.create({
          notebookId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId: null,
        });

      category.children?.forEach((childName) => {
        const existingChild = consolidateDefaultCategory(
          notebookId,
          category.type,
          childName,
          parent.id,
        );

        if (existingChild) {
          return;
        }

        this.create({
          notebookId,
          name: childName,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId: parent.id,
        });
      });

      const previousIcon = previousDefaultIcons[`${category.type}:${category.name}`];

      if (previousIcon && parent.icon === previousIcon) {
        database.runSync(
          `
            UPDATE category
            SET icon = ?, updated_at = ?
            WHERE id = ?
              AND notebook_id = ?
              AND archived_at IS NULL
          `,
          category.icon,
          getCurrentTimestamp(),
          parent.id,
          notebookId,
        );
      }
    });
  },
};
