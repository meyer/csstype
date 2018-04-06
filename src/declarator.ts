import { atRuleDescriptors, atRuleList } from './at-rules';
import { toCamelCase, toPascalCase, toVendorPrefixCase } from './casing';
import dataTypes from './data-types';
import {
  globals,
  standardLonghandProperties,
  standardShorthandProperties,
  svgProperties,
  vendorPrefixedLonghandProperties,
  vendorPrefixedShorthandProperties,
} from './properties';
import { advancedPseudos, simplePseudos } from './pseudos';
import { IAlias, IDataType, IGenerics, Type, TypeType } from './typer';

interface Interface {
  name: string;
  generics: IGenerics[];
  extends: Interface[];
  fallback: boolean;
  properties: PropertyType[];
}

interface IPropertyAlias {
  name: string;
  generics: IGenerics[];
  alias: IAlias;
}

interface IPropertyType {
  name: string;
  type: DeclarableType;
}

type PropertyType = IPropertyAlias | IPropertyType;

export type MixedType = TypeType<IDataType | IAlias>;
export type DeclarableType = TypeType<IAlias>;

export interface IDeclaration {
  name: string;
  export: boolean;
  types: DeclarableType[];
  generics: IGenerics[];
}

export const lengthGeneric: IGenerics = {
  name: 'TLength',
  defaults: 'string | 0',
};

const globalsDeclaration: IDeclaration = {
  name: 'Globals',
  export: false,
  types: declarable(globals),
  generics: [],
};

const globalsAndStringDeclaration: IDeclaration = {
  name: 'GlobalsString',
  export: false,
  types: declarable([aliasOf(globalsDeclaration), { type: Type.String }]),
  generics: [],
};

const globalsAndNumberDeclaration: IDeclaration = {
  name: 'GlobalsNumber',
  export: false,
  types: declarable([aliasOf(globalsDeclaration), { type: Type.Number }]),
  generics: [],
};

const advancedPseudoDeclaration: IDeclaration = {
  name: 'AdvancedPseudos',
  export: true,
  types: declarable(advancedPseudos),
  generics: [],
};

const simplePseudoDeclaration: IDeclaration = {
  name: 'SimplePseudos',
  export: true,
  types: declarable(simplePseudos),
  generics: [],
};

const pseudoDeclaration: IDeclaration = {
  name: 'Pseudos',
  export: true,
  types: [aliasOf(advancedPseudoDeclaration), aliasOf(simplePseudoDeclaration)],
  generics: [],
};

const atRuleDeclaration: IDeclaration = {
  name: 'AtRules',
  export: true,
  types: declarable(atRuleList),
  generics: [],
};

const standardLonghandPropertiesDefinition: IPropertyAlias[] = [];
const standardShorthandPropertiesDefinition: IPropertyAlias[] = [];
const standardLonghandPropertiesHyphenDefinition: IPropertyAlias[] = [];
const standardShorthandPropertiesHyphenDefinition: IPropertyAlias[] = [];
const vendorLonghandPropertiesDefinition: IPropertyAlias[] = [];
const vendorShorthandPropertiesDefinition: IPropertyAlias[] = [];
const vendorLonghandPropertiesHyphenDefinition: IPropertyAlias[] = [];
const vendorShorthandPropertiesHyphenDefinition: IPropertyAlias[] = [];
const svgPropertiesDefinition: IPropertyAlias[] = [];
const svgPropertiesHyphenDefinition: IPropertyAlias[] = [];

const PROPERTY = 'Property';

export const declarations: IDeclaration[] = [
  atRuleDeclaration,
  advancedPseudoDeclaration,
  simplePseudoDeclaration,
  pseudoDeclaration,
  globalsDeclaration,
  globalsAndStringDeclaration,
  globalsAndNumberDeclaration,
];

for (const properties of [
  standardLonghandProperties,
  standardShorthandProperties,
  vendorPrefixedLonghandProperties,
  vendorPrefixedShorthandProperties,
  svgProperties,
]) {
  let definitions: IPropertyAlias[];
  let hyphenDefinitions: IPropertyAlias[];
  let isVendorProperties = false;

  switch (properties) {
    case svgProperties:
      definitions = svgPropertiesDefinition;
      hyphenDefinitions = svgPropertiesHyphenDefinition;
      break;
    case vendorPrefixedShorthandProperties:
      definitions = vendorShorthandPropertiesDefinition;
      hyphenDefinitions = vendorShorthandPropertiesHyphenDefinition;
      isVendorProperties = true;
      break;
    case vendorPrefixedLonghandProperties:
      definitions = vendorLonghandPropertiesDefinition;
      hyphenDefinitions = vendorLonghandPropertiesHyphenDefinition;
      isVendorProperties = true;
      break;
    case standardShorthandProperties:
      definitions = standardShorthandPropertiesDefinition;
      hyphenDefinitions = standardShorthandPropertiesHyphenDefinition;
      break;
    default:
      definitions = standardLonghandPropertiesDefinition;
      hyphenDefinitions = standardLonghandPropertiesHyphenDefinition;
      break;
  }

  // Loop in alphabetical order
  for (const name of Object.keys(properties).sort()) {
    const types = filterMissingDataTypes(properties[name]);
    let declaration: IDeclaration;
    const generics = lengthIn(types) ? [lengthGeneric] : [];

    if (types.length === 0) {
      declaration = globalsDeclaration;
    } else if (onlyContainsString(types)) {
      declaration = globalsAndStringDeclaration;
    } else if (onlyContainsNumber(types)) {
      declaration = globalsAndNumberDeclaration;
    } else {
      const declarationName = toPascalCase(name) + PROPERTY;

      declaration = {
        name: declarationName,
        export: false,
        types: [aliasOf(globalsDeclaration), ...declarable(types)],
        generics,
      };

      // Some SVG properties are shared with regular style properties
      // and we assume here that they are identical
      if (!declarationExists(declarationName)) {
        declarations.push(declaration);
      }
    }

    definitions.push({
      name: isVendorProperties ? toVendorPrefixCase(name) : toCamelCase(name),
      generics,
      alias: aliasOf(declaration),
    });
    hyphenDefinitions.push({
      name,
      generics,
      alias: aliasOf(declaration),
    });
  }
}

const atRuleDefinitions: { [name: string]: PropertyType[] } = {};
const atRuleHyphenDefinitions: { [name: string]: PropertyType[] } = {};

for (const name in atRuleDescriptors) {
  atRuleDefinitions[name] = [];
  atRuleHyphenDefinitions[name] = [];

  for (const property in atRuleDescriptors[name]) {
    const types = filterMissingDataTypes(atRuleDescriptors[name][property]);
    const generics = lengthIn(types) ? [lengthGeneric] : [];

    if (onlyContainsString(types) || onlyContainsNumber(types)) {
      const type: DeclarableType = {
        type: onlyContainsString(types) ? Type.String : Type.Number,
      };

      atRuleDefinitions[name].push({
        name: toCamelCase(property),
        type,
      });
      atRuleHyphenDefinitions[name].push({
        name: property,
        type,
      });
    } else {
      const declaration: IDeclaration = {
        name: toPascalCase(name.slice(1)) + toPascalCase(property) + PROPERTY,
        export: false,
        types: declarable(types),
        generics,
      };
      declarations.push(declaration);

      atRuleDefinitions[name].push({
        name: toCamelCase(property),
        generics,
        alias: aliasOf(declaration),
      });
      atRuleHyphenDefinitions[name].push({
        name: property,
        generics,
        alias: aliasOf(declaration),
      });
    }
  }
}

for (const name in dataTypes) {
  declarations.push({
    name: toPascalCase(name),
    export: false,
    types: declarable(dataTypes[name]),
    generics: lengthIn(dataTypes[name]) ? [lengthGeneric] : [],
  });
}

const PROPERTIES = 'Properties';
const LONGHAND = 'Longhand';
const SHORTHAND = 'Shorthand';
const STANDARD = 'Standard';
const INTERFACE_STANDARD_LONGHAND_PROPERTIES = STANDARD + LONGHAND + PROPERTIES;
const INTERFACE_STANDARD_SHORTHAND_PROPERTIES = STANDARD + SHORTHAND + PROPERTIES;
const INTERFACE_STANDARD_PROPERTIES = STANDARD + PROPERTIES;
const VENDOR = 'Vendor';
const INTERFACE_VENDOR_LONGHAND_PROPERTIES = VENDOR + LONGHAND + PROPERTIES;
const INTERFACE_VENDOR_SHORTHAND_PROPERTIES = VENDOR + SHORTHAND + PROPERTIES;
const INTERFACE_VENDOR_PROPERTIES = VENDOR + PROPERTIES;
const SVG = 'Svg';
const INTERFACE_SVG_PROPERTIES = SVG + PROPERTIES;
const INTERFACE_ALL_PROPERTIES = PROPERTIES;
const HYPHEN = 'Hyphen';
const INTERFACE_STANDARD_LONGHAND_PROPERTIES_HYPHEN = INTERFACE_STANDARD_LONGHAND_PROPERTIES + HYPHEN;
const INTERFACE_STANDARD_SHORTHAND_PROPERTIES_HYPHEN = INTERFACE_STANDARD_SHORTHAND_PROPERTIES + HYPHEN;
const INTERFACE_STANDARD_PROPERTIES_HYPHEN = INTERFACE_STANDARD_PROPERTIES + HYPHEN;
const INTERFACE_VENDOR_LONGHAND_PROPERTIES_HYPHEN = INTERFACE_VENDOR_LONGHAND_PROPERTIES + HYPHEN;
const INTERFACE_VENDOR_SHORTHAND_PROPERTIES_HYPHEN = INTERFACE_VENDOR_SHORTHAND_PROPERTIES + HYPHEN;
const INTERFACE_VENDOR_PROPERTIES_HYPHEN = INTERFACE_VENDOR_PROPERTIES + HYPHEN;
const INTERFACE_SVG_PROPERTIES_HYPHEN = INTERFACE_SVG_PROPERTIES + HYPHEN;
const INTERFACE_ALL_PROPERTIES_HYPHEN = INTERFACE_ALL_PROPERTIES + HYPHEN;
const FALLBACK = 'Fallback';
const INTERFACE_STANDARD_LONGHAND_PROPERTIES_FALLBACK = INTERFACE_STANDARD_LONGHAND_PROPERTIES + FALLBACK;
const INTERFACE_STANDARD_SHORTHAND_PROPERTIES_FALLBACK = INTERFACE_STANDARD_SHORTHAND_PROPERTIES + FALLBACK;
const INTERFACE_STANDARD_PROPERTIES_FALLBACK = INTERFACE_STANDARD_PROPERTIES + FALLBACK;
const INTERFACE_VENDOR_LONGHAND_PROPERTIES_FALLBACK = INTERFACE_VENDOR_LONGHAND_PROPERTIES + FALLBACK;
const INTERFACE_VENDOR_SHORTHAND_PROPERTIES_FALLBACK = INTERFACE_VENDOR_SHORTHAND_PROPERTIES + FALLBACK;
const INTERFACE_VENDOR_PROPERTIES_FALLBACK = INTERFACE_VENDOR_PROPERTIES + FALLBACK;
const INTERFACE_SVG_PROPERTIES_FALLBACK = INTERFACE_SVG_PROPERTIES + FALLBACK;
const INTERFACE_ALL_PROPERTIES_FALLBACK = INTERFACE_ALL_PROPERTIES + FALLBACK;
const INTERFACE_STANDARD_LONGHAND_PROPERTIES_HYPHEN_FALLBACK =
  INTERFACE_STANDARD_LONGHAND_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_STANDARD_SHORTHAND_PROPERTIES_HYPHEN_FALLBACK =
  INTERFACE_STANDARD_SHORTHAND_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_STANDARD_PROPERTIES_HYPHEN_FALLBACK = INTERFACE_STANDARD_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_VENDOR_LONGHAND_PROPERTIES_HYPHEN_FALLBACK = INTERFACE_VENDOR_LONGHAND_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_VENDOR_SHORTHAND_PROPERTIES_HYPHEN_FALLBACK = INTERFACE_VENDOR_SHORTHAND_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_VENDOR_PROPERTIES_HYPHEN_FALLBACK = INTERFACE_VENDOR_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_SVG_PROPERTIES_HYPHEN_FALLBACK = INTERFACE_SVG_PROPERTIES + HYPHEN + FALLBACK;
const INTERFACE_ALL_PROPERTIES_HYPHEN_FALLBACK = INTERFACE_ALL_PROPERTIES + HYPHEN + FALLBACK;

const standardLonghandPropertiesGenerics = genericsOf(standardLonghandPropertiesDefinition);
const standardShorthandPropertiesGenerics = genericsOf(standardShorthandPropertiesDefinition);
const standardPropertiesGenerics = genericsOf([
  ...standardLonghandPropertiesDefinition,
  ...standardShorthandPropertiesDefinition,
]);
const vendorLonghandPropertiesGenerics = genericsOf(vendorLonghandPropertiesDefinition);
const vendorShorthandPropertiesGenerics = genericsOf(vendorShorthandPropertiesDefinition);
const vendorPropertiesGenerics = genericsOf([
  ...vendorLonghandPropertiesDefinition,
  ...vendorShorthandPropertiesDefinition,
]);
const svgPropertiesGenerics = genericsOf([...svgPropertiesDefinition]);
const allPropertiesGenerics = genericsOf([
  ...standardLonghandPropertiesDefinition,
  ...standardShorthandPropertiesDefinition,
  ...vendorLonghandPropertiesDefinition,
  ...vendorShorthandPropertiesDefinition,
  ...svgPropertiesDefinition,
]);

const standardLonghandPropertiesInterface: Interface = {
  name: INTERFACE_STANDARD_LONGHAND_PROPERTIES,
  generics: standardLonghandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: standardLonghandPropertiesDefinition,
};

const standardShorthandPropertiesInterface: Interface = {
  name: INTERFACE_STANDARD_SHORTHAND_PROPERTIES,
  generics: standardShorthandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: standardShorthandPropertiesDefinition,
};

const standardPropertiesInterface: Interface = {
  name: INTERFACE_STANDARD_PROPERTIES,
  generics: standardPropertiesGenerics,
  extends: [standardLonghandPropertiesInterface, standardShorthandPropertiesInterface],
  fallback: false,
  properties: [],
};

const vendorLonghandPropertiesInterface: Interface = {
  name: INTERFACE_VENDOR_LONGHAND_PROPERTIES,
  generics: vendorLonghandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: vendorLonghandPropertiesDefinition,
};

const vendorShorthandPropertiesInterface: Interface = {
  name: INTERFACE_VENDOR_SHORTHAND_PROPERTIES,
  generics: vendorShorthandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: vendorShorthandPropertiesDefinition,
};

const vendorPropertiesInterface: Interface = {
  name: INTERFACE_VENDOR_PROPERTIES,
  generics: vendorPropertiesGenerics,
  extends: [vendorLonghandPropertiesInterface, vendorShorthandPropertiesInterface],
  fallback: false,
  properties: [],
};

const svgPropertiesInterface: Interface = {
  name: INTERFACE_SVG_PROPERTIES,
  generics: svgPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: svgPropertiesDefinition,
};

const allPropertiesInterface: Interface = {
  name: INTERFACE_ALL_PROPERTIES,
  generics: allPropertiesGenerics,
  extends: [standardPropertiesInterface, vendorPropertiesInterface, svgPropertiesInterface],
  fallback: false,
  properties: [],
};

const standardLonghandPropertiesHyphenInterface: Interface = {
  name: INTERFACE_STANDARD_LONGHAND_PROPERTIES_HYPHEN,
  generics: standardLonghandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: standardLonghandPropertiesHyphenDefinition,
};

const standardShorthandPropertiesHyphenInterface: Interface = {
  name: INTERFACE_STANDARD_SHORTHAND_PROPERTIES_HYPHEN,
  generics: standardShorthandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: standardShorthandPropertiesHyphenDefinition,
};

const standardPropertiesHyphenInterface: Interface = {
  name: INTERFACE_STANDARD_PROPERTIES_HYPHEN,
  generics: standardPropertiesGenerics,
  extends: [standardLonghandPropertiesHyphenInterface, standardShorthandPropertiesHyphenInterface],
  fallback: false,
  properties: [],
};

const vendorLonghandPropertiesHyphenInterface: Interface = {
  name: INTERFACE_VENDOR_LONGHAND_PROPERTIES_HYPHEN,
  generics: vendorLonghandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: vendorLonghandPropertiesHyphenDefinition,
};

const vendorShorthandPropertiesHyphenInterface: Interface = {
  name: INTERFACE_VENDOR_SHORTHAND_PROPERTIES_HYPHEN,
  generics: vendorShorthandPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: vendorShorthandPropertiesHyphenDefinition,
};

const vendorPropertiesHyphenInterface: Interface = {
  name: INTERFACE_VENDOR_PROPERTIES_HYPHEN,
  generics: vendorPropertiesGenerics,
  extends: [vendorLonghandPropertiesHyphenInterface, vendorShorthandPropertiesHyphenInterface],
  fallback: false,
  properties: [],
};

const svgPropertiesHyphenInterface: Interface = {
  name: INTERFACE_SVG_PROPERTIES_HYPHEN,
  generics: svgPropertiesGenerics,
  extends: [],
  fallback: false,
  properties: svgPropertiesHyphenDefinition,
};

const allPropertiesHyphenInterface: Interface = {
  name: INTERFACE_ALL_PROPERTIES_HYPHEN,
  generics: allPropertiesGenerics,
  extends: [standardPropertiesHyphenInterface, vendorPropertiesHyphenInterface, svgPropertiesHyphenInterface],
  fallback: false,
  properties: [],
};

const standardLongformPropertiesFallbackInterface: Interface = {
  ...standardLonghandPropertiesInterface,
  name: INTERFACE_STANDARD_LONGHAND_PROPERTIES_FALLBACK,
  fallback: true,
};

const standardShorthandPropertiesFallbackInterface: Interface = {
  ...standardShorthandPropertiesInterface,
  name: INTERFACE_STANDARD_SHORTHAND_PROPERTIES_FALLBACK,
  fallback: true,
};

const standardPropertiesFallbackInterface: Interface = {
  ...standardPropertiesInterface,
  name: INTERFACE_STANDARD_PROPERTIES_FALLBACK,
  extends: [standardLongformPropertiesFallbackInterface, standardShorthandPropertiesFallbackInterface],
  fallback: true,
};

const vendorLonghandPropertiesFallbackInterface: Interface = {
  ...vendorLonghandPropertiesInterface,
  name: INTERFACE_VENDOR_LONGHAND_PROPERTIES_FALLBACK,
  fallback: true,
};

const vendorShorthandPropertiesFallbackInterface: Interface = {
  ...vendorShorthandPropertiesInterface,
  name: INTERFACE_VENDOR_SHORTHAND_PROPERTIES_FALLBACK,
  fallback: true,
};

const vendorPropertiesFallbackInterface: Interface = {
  ...vendorPropertiesInterface,
  name: INTERFACE_VENDOR_PROPERTIES_FALLBACK,
  extends: [vendorLonghandPropertiesFallbackInterface, vendorShorthandPropertiesFallbackInterface],
  fallback: true,
};

const svgPropertiesFallbackInterface: Interface = {
  ...svgPropertiesInterface,
  name: INTERFACE_SVG_PROPERTIES_FALLBACK,
  fallback: true,
};

const allPropertiesFallbackInterface: Interface = {
  ...allPropertiesInterface,
  name: INTERFACE_ALL_PROPERTIES_FALLBACK,
  extends: [standardPropertiesFallbackInterface, vendorPropertiesFallbackInterface, svgPropertiesFallbackInterface],
  fallback: true,
};

const standardLongformPropertiesHyphenFallbackInterface: Interface = {
  ...standardLonghandPropertiesHyphenInterface,
  name: INTERFACE_STANDARD_LONGHAND_PROPERTIES_HYPHEN_FALLBACK,
  fallback: true,
};

const standardShorthandPropertiesHyphenFallbackInterface: Interface = {
  ...standardShorthandPropertiesHyphenInterface,
  name: INTERFACE_STANDARD_SHORTHAND_PROPERTIES_HYPHEN_FALLBACK,
  fallback: true,
};

const standardPropertiesHyphenFallbackInterface: Interface = {
  ...standardPropertiesHyphenInterface,
  name: INTERFACE_STANDARD_PROPERTIES_HYPHEN_FALLBACK,
  extends: [standardLongformPropertiesHyphenFallbackInterface, standardShorthandPropertiesHyphenFallbackInterface],
  fallback: true,
};

const vendorLonghandPropertiesHyphenFallbackInterface: Interface = {
  ...vendorLonghandPropertiesHyphenInterface,
  name: INTERFACE_VENDOR_LONGHAND_PROPERTIES_HYPHEN_FALLBACK,
  fallback: true,
};

const vendorShorthandPropertiesHyphenFallbackInterface: Interface = {
  ...vendorShorthandPropertiesHyphenInterface,
  name: INTERFACE_VENDOR_SHORTHAND_PROPERTIES_HYPHEN_FALLBACK,
  fallback: true,
};

const vendorPropertiesHyphenFallbackInterface: Interface = {
  ...vendorPropertiesHyphenInterface,
  name: INTERFACE_VENDOR_PROPERTIES_HYPHEN_FALLBACK,
  extends: [vendorLonghandPropertiesHyphenFallbackInterface, vendorShorthandPropertiesHyphenFallbackInterface],
  fallback: true,
};

const svgPropertiesHyphenFallbackInterface: Interface = {
  ...svgPropertiesHyphenInterface,
  name: INTERFACE_SVG_PROPERTIES_HYPHEN_FALLBACK,
  fallback: true,
};

const allPropertiesHyphenFallbackInterface: Interface = {
  ...allPropertiesHyphenInterface,
  name: INTERFACE_ALL_PROPERTIES_HYPHEN_FALLBACK,
  extends: [
    standardPropertiesHyphenFallbackInterface,
    vendorPropertiesHyphenFallbackInterface,
    svgPropertiesHyphenFallbackInterface,
  ],
  fallback: true,
};

const atRuleInterfaces: Interface[] = [];

for (const name in atRuleDefinitions) {
  const pascalName = toPascalCase(name.slice(1));
  const generics = genericsOf(atRuleDefinitions[name].filter(isAliasProperty));
  atRuleInterfaces.push(
    {
      name: pascalName,
      generics,
      extends: [],
      fallback: false,
      properties: atRuleDefinitions[name],
    },
    {
      name: pascalName + HYPHEN,
      generics,
      extends: [],
      fallback: false,
      properties: atRuleHyphenDefinitions[name],
    },
    {
      name: pascalName + FALLBACK,
      generics,
      extends: [],
      fallback: true,
      properties: atRuleDefinitions[name],
    },
    {
      name: pascalName + HYPHEN + FALLBACK,
      generics,
      extends: [],
      fallback: true,
      properties: atRuleHyphenDefinitions[name],
    },
  );
}

export const interfaces = [
  standardLonghandPropertiesInterface,
  standardShorthandPropertiesInterface,
  standardPropertiesInterface,
  vendorLonghandPropertiesInterface,
  vendorShorthandPropertiesInterface,
  vendorPropertiesInterface,
  svgPropertiesInterface,
  allPropertiesInterface,
  standardLonghandPropertiesHyphenInterface,
  standardShorthandPropertiesHyphenInterface,
  standardPropertiesHyphenInterface,
  vendorLonghandPropertiesHyphenInterface,
  vendorShorthandPropertiesHyphenInterface,
  vendorPropertiesHyphenInterface,
  svgPropertiesHyphenInterface,
  allPropertiesHyphenInterface,
  standardLongformPropertiesFallbackInterface,
  standardShorthandPropertiesFallbackInterface,
  standardPropertiesFallbackInterface,
  vendorLonghandPropertiesFallbackInterface,
  vendorShorthandPropertiesFallbackInterface,
  vendorPropertiesFallbackInterface,
  svgPropertiesFallbackInterface,
  allPropertiesFallbackInterface,
  standardLongformPropertiesHyphenFallbackInterface,
  standardShorthandPropertiesHyphenFallbackInterface,
  standardPropertiesHyphenFallbackInterface,
  vendorLonghandPropertiesHyphenFallbackInterface,
  vendorShorthandPropertiesHyphenFallbackInterface,
  vendorPropertiesHyphenFallbackInterface,
  svgPropertiesHyphenFallbackInterface,
  allPropertiesHyphenFallbackInterface,
  ...atRuleInterfaces,
];

function declarable(types: MixedType[]): DeclarableType[] {
  return types.sort(sorter).map<DeclarableType>(
    type =>
      type.type === Type.DataType
        ? {
            type: Type.Alias,
            name: toPascalCase(type.name),
            generics: type.name && type.name in dataTypes && lengthIn(dataTypes[type.name]) ? [lengthGeneric] : [],
          }
        : type,
  );
}

function sorter(a: MixedType, b: MixedType) {
  if (a.type === Type.StringLiteral && b.type === Type.StringLiteral) {
    return a.literal < b.literal ? -1 : a.literal > b.literal ? 1 : 0;
  }
  if (a.type === Type.NumericLiteral && b.type === Type.NumericLiteral) {
    return a.literal - b.literal;
  }
  return a.type - b.type;
}

function genericsOf(definitions: IPropertyAlias[]) {
  return Array.from(new Set(([] as IGenerics[]).concat(...definitions.map(definition => definition.generics))));
}

export function isAliasProperty(value: PropertyType): value is IPropertyAlias {
  return 'alias' in value;
}

export function lengthIn(types: MixedType[]) {
  return !types.every(type => {
    if (type.type === Type.Length) {
      return false;
    }
    if (type.type === Type.DataType && type.name && type.name in dataTypes && lengthIn(dataTypes[type.name])) {
      return false;
    }
    return true;
  });
}

function aliasOf({ name, types }: IDeclaration): IAlias {
  return {
    type: Type.Alias,
    name,
    generics: lengthIn(types) ? [lengthGeneric] : [],
  };
}

function filterMissingDataTypes(types: MixedType[]) {
  // Exclude type aliases that's not of interest
  const filtered = types.filter(type => type.type !== Type.DataType || (!!type.name && type.name in dataTypes));

  // Those excluded type aliases need to resolve to string
  if (filtered.length < types.length && filtered.every(type => type.type !== Type.String)) {
    filtered.push({ type: Type.String });
  }

  return filtered;
}

function onlyContainsString(types: MixedType[]) {
  return types.every(type => type.type === Type.String);
}

function onlyContainsNumber(types: MixedType[]) {
  return types.every(type => type.type === Type.Number);
}

function declarationExists(name: string) {
  return !declarations.every(declaration => declaration.name !== name);
}
