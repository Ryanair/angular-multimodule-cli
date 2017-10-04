/* tslint:disable */

export interface PackageDescription {
  name: string;
  hasTestingModule: boolean;
}

export interface Config {
  packages: PackageDescription[];
  scope: string;
}

// The order is important for managing dependencies
export const packages: PackageDescription[] = [
  {
    name: 'core',
    hasTestingModule: false
  },
  {
    name: 'feature',
    hasTestingModule: false
  }
];
