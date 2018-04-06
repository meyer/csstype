import * as properties from 'mdn-data/css/properties.json';
import { compatProperties } from './compat';
import { properties as svgData } from './data/svg';
import parse from './parser';
import typing, { TypeType } from './typer';

const IGNORES = [
  // Custom properties
  '--*',
  // We define this manually
  'all',
];

const REGEX_VENDOR_PROPERTY = /^-/;

// The CSS-wide keywords are identical to the `all` property
// https://www.w3.org/TR/2016/CR-css-cascade-4-20160114/#all-shorthand
export const globals: TypeType[] = typing(parse(properties.all.syntax));

export const standardLonghandProperties: { [name: string]: TypeType[] } = {};
export const standardShorthandProperties: { [name: string]: TypeType[] } = {
  // Empty so that it only receives CSS-wide keywords
  all: [],
};
export const vendorPrefixedLonghandProperties: { [name: string]: TypeType[] } = {};
export const vendorPrefixedShorthandProperties: { [name: string]: TypeType[] } = {};
export const svgProperties: { [name: string]: TypeType[] } = {};

for (const originalName in properties) {
  if (IGNORES.includes(originalName)) {
    continue;
  }

  const propertyNames = [originalName, ...compatProperties(originalName)];
  const types = typing(parse(properties[originalName].syntax));

  for (const name of propertyNames) {
    const isShorthand = Array.isArray(properties[originalName].computed);

    if (REGEX_VENDOR_PROPERTY.test(name)) {
      if (isShorthand) {
        vendorPrefixedShorthandProperties[name] = types;
      } else {
        vendorPrefixedLonghandProperties[name] = types;
      }
    } else {
      if (isShorthand) {
        standardShorthandProperties[name] = types;
      } else {
        standardLonghandProperties[name] = types;
      }
    }
  }
}

for (const name in svgData) {
  const syntax = svgData[name].syntax;
  if (syntax) {
    svgProperties[name] = typing(parse(syntax));
  }
}
