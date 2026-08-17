import { accountRepository } from "@/database/repositories/account.repository";
import { categoryRepository } from "@/database/repositories/category.repository";
import { notebookRepository } from "@/database/repositories/notebook.repository";

const starterNotebook = {
  name: "Predeterminada",
  description: "Libreta inicial para tus cuentas y movimientos diarios.",
  icon: "notebook-outline",
  color: "#847DFF",
  currency: "MXN",
};

const starterAccount = {
  name: "Cartera",
  description: "Efectivo disponible.",
  type: "CASH" as const,
  icon: "wallet-outline",
  color: "#7DD8A8",
};

export function bootstrapStarterData() {
  const activeNotebooks = notebookRepository.listActive();

  if (activeNotebooks.length > 0) {
    return;
  }

  const notebook = notebookRepository.create(starterNotebook);

  notebookRepository.setDefault(notebook.id);
  categoryRepository.seedDefaultCategories(notebook.id);
  accountRepository.create({
    notebookId: notebook.id,
    ...starterAccount,
  });
}
