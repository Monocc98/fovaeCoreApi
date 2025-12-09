import { Validators } from "../../../config";

export interface ConceptMappingDto {
  externalConceptKey: string;
  subsubcategoryId: string;
}

export class ConfirmSolucionFactibleDto {

  private constructor(
    public readonly concepts: ConceptMappingDto[],
  ) {}

  static create(object: { [key: string]: any }): [string?, ConfirmSolucionFactibleDto?] {

    const { concepts } = object;

    if (!Array.isArray(concepts) || concepts.length === 0) {
      return ['Missing concepts'];
    }

    for (const c of concepts) {
      if (!c.externalConceptKey) return ['Missing externalConceptKey in concepts'];
      if (!c.subsubcategoryId) return ['Missing subsubcategoryId in concepts'];
      if (!Validators.isMongoID(c.subsubcategoryId)) return ['Invalid subsubcategoryId'];
    }

    return [undefined, new ConfirmSolucionFactibleDto(concepts)];
  }
}
