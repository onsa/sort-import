//  Angular imports
// comment #1
export { AAngularModule, GAngularModule, ZAngularModule } from '@angular/some-module';
// comment #3
export { CAngularModule, DAngularModule, LAngularModule } from '@angular/other-module';
//  Application imports
// comment #5
export {
  AApplicationModule,
  EApplicationModule,
  HApplicationModule,
  NApplicationModule,
  OApplicationModule,
  QApplicationModule
} from './test-file.2';
// comment #2
export { DApplicationModule } from './test-file.1';
export SApplicationModule from './test-file.1';

export class SomeClass {

}

export enum SomeEnum {

}

export const someVariable = 1;

export namespace SomeNamespace {
    export function someFunction() {

    }

    export function fromContainingFunction() {

    }
}
