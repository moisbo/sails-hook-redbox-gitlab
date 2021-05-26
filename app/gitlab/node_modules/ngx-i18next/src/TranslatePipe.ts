import {
    Inject,
    Pipe,
    PipeTransform
} from '@angular/core';

import {TranslateI18Next} from './TranslateI18Next';

@Pipe({
    name: 'translate',
    pure: false        // Force refresh after changing the language
})
export class TranslatePipe implements PipeTransform {

    constructor(@Inject(TranslateI18Next) private translateI18Next:TranslateI18Next) {
    }

    public transform(value:string, args?:any[]):string {
        return this.translateI18Next.translate(value, Array.isArray(args) && args.length ? args[0] : args);
    }
}
