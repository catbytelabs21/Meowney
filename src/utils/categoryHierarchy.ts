import type { Category, CategoryType } from "@/features/categories/types";

export function getCategoryDisplayName(categories: Category[], category: Category | null | undefined) {
  if (!category) {
    return "";
  }

  const parent = category.parentId
    ? categories.find((candidate) => candidate.id === category.parentId)
    : null;

  return parent ? `${parent.name} / ${category.name}` : category.name;
}

export function getCategoryDisplayNameById(categories: Category[], categoryId: string) {
  return getCategoryDisplayName(
    categories,
    categories.find((category) => category.id === categoryId),
  );
}

export function getPrimaryCategories(categories: Category[], type?: CategoryType) {
  return categories.filter(
    (category) => !category.parentId && (!type || category.type === type),
  );
}

export function getSubcategories(categories: Category[], parentId: string | null | undefined) {
  if (!parentId) {
    return [];
  }

  return categories.filter((category) => category.parentId === parentId);
}

export function getSelectedParentCategory(categories: Category[], categoryId: string) {
  const selectedCategory = categories.find((category) => category.id === categoryId);

  if (!selectedCategory) {
    return null;
  }

  if (!selectedCategory.parentId) {
    return selectedCategory;
  }

  return categories.find((category) => category.id === selectedCategory.parentId) ?? selectedCategory;
}

export function getSelectedSubcategory(categories: Category[], categoryId: string) {
  const selectedCategory = categories.find((category) => category.id === categoryId);

  return selectedCategory?.parentId ? selectedCategory : null;
}

export function getCategoryAndChildIds(categories: Category[], categoryId: string) {
  return new Set([
    categoryId,
    ...categories
      .filter((category) => category.parentId === categoryId)
      .map((category) => category.id),
  ]);
}
