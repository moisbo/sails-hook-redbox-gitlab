import {NgModule} from '@angular/core';

import {TranslatePipe} from "./TranslatePipe";
import {TranslateI18Next} from "./TranslateI18Next";
import {TranslateI18NextLanguagesSupport} from "./TranslateI18NextLanguageDetector";

@NgModule({
	providers: [
		TranslateI18Next,
		TranslateI18NextLanguagesSupport
	],
	declarations: [
		TranslatePipe
	],
	exports: [
		TranslatePipe
	]
})
export class TranslateI18NextModule {
}
