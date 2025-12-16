import { CustomError } from "../domain";

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

type HeaderMap = {
  fecha: string;
  matricula: string;
  nombre: string;
  grupo?: string;
  periodo?: string;
  conc: string;
  formaPago?: string;
  cargo?: string;
  recargo?: string;
  importe: string;
};

export const findHeaderRowIndex = (rows: any[][]) => {
  // buscamos una fila que contenga “fecha” y “importe” y “conc”
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map(norm);
    const hasFecha = cells.includes("fecha");
    const hasImporte = cells.includes("importe");
    const hasConc = cells.includes("conc");
    if (hasFecha && hasImporte && hasConc) return i;
  }
  return -1;
};

export const buildHeaderMap = (headerRow: any[]): HeaderMap => {
  // mapea por “nombre normalizado”
  const idxByName = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    const key = norm(cell);
    if (key) idxByName.set(key, idx);
  });

  // tolerancia a variaciones
  const pick = (candidates: string[]) => {
    for (const c of candidates) {
      const i = idxByName.get(c);
      if (i !== undefined) return i;
    }
    return undefined;
  };

  const fechaIdx = pick(["fecha"]);
  const concIdx = pick(["conc"]);
  const importeIdx = pick(["importe"]);

  if (fechaIdx === undefined || concIdx === undefined || importeIdx === undefined) {
    throw CustomError.badRequest(
      `No se encontró cabecera esperada. Debe incluir al menos: Fecha, Conc, Importe`
    );
  }

  return {
    fecha: String(fechaIdx),
    conc: String(concIdx),
    importe: String(importeIdx),
    matricula: String(pick(["matricula"]) ?? ""),
    nombre: String(pick(["nombre"]) ?? ""),
    grupo: String(pick(["grupo"]) ?? ""),
    periodo: String(pick(["periodo/cobranza", "periodo cobranza", "periodo"]) ?? ""),
    formaPago: String(pick(["fm. pag", "fm pag", "forma de pago"]) ?? ""),
    cargo: String(pick(["cargo"]) ?? ""),
    recargo: String(pick(["recargo"]) ?? ""),
  };
};
