import type React from 'react';
import type { Advisor } from '../../types/index.ts';

/**
 * Niveles del equipo contable:
 *  - auxiliar: ve los módulos marcados con minLevel 'auxiliar'.
 *  - contador: ve TODO lo del auxiliar y además los módulos marcados con minLevel 'contador'.
 */
export type AccountingLevel = 'auxiliar' | 'contador';

export const ACCOUNTING_LEVEL_LABEL: Record<AccountingLevel, string> = {
  auxiliar: 'Auxiliar contable',
  contador: 'Contador'
};

const LEVEL_RANK: Record<AccountingLevel, number> = { auxiliar: 1, contador: 2 };

export const isAccountingUser = (adv?: Pick<Advisor, 'role'> | null): boolean =>
  adv?.role === 'auxiliar' || adv?.role === 'contador';

/** true si el nivel del usuario alcanza el nivel mínimo que pide el módulo. */
export const canAccessLevel = (userLevel: AccountingLevel, required: AccountingLevel): boolean =>
  LEVEL_RANK[userLevel] >= LEVEL_RANK[required];

export interface AccountingModule {
  id: string;
  title: string;
  description: string;
  /** Nivel mínimo para verlo. El contador siempre ve también los del auxiliar. */
  minLevel: AccountingLevel;
  /** Pantalla del módulo. */
  render: (ctx: { level: AccountingLevel; userName: string }) => React.ReactNode;
}

/**
 * Registro de módulos contables. Para agregar uno: crear su componente y añadir una entrada aquí
 * con su `minLevel` ('auxiliar' lo ven ambos; 'contador' solo el contador).
 */
export const ACCOUNTING_MODULES: AccountingModule[] = [];
