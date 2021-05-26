import {ILanguageDetector} from './browser/ILanguageDetector';
import {IBackendOptions} from './backend/IBackendOptions';

export interface ITranslationKeyMapping {
    [index:string]:string;
}

export interface IInterpolation {
    prefix?:string;
    suffix?:string;
}

export interface I18NextOptions {
    /**
     * I18next options
     */
    debug?:boolean;
    initImmediate?:boolean;
    lng?:string;
    fallbackLng?:string;
    ns?:string|Array<string>;
    defaultNS?:string;
    fallbackNS?:boolean;
    whitelist?:boolean;
    nonExplicitWhitelist?:boolean;
    lowerCaseLng?:boolean;
    load?:string;
    preload?:boolean;
    pluralSeparator?:string;
    contextSeparator?:string;
    saveMissing?:boolean;
    saveMissingTo?:string;
    missingKeyHandler?:boolean;
    appendNamespaceToMissingKey?:boolean;
    postProcess?:boolean;
    returnNull?:boolean;
    returnEmptyString?:boolean;
    returnObjects?:boolean;
    joinArrays?:boolean;
    backend?:IBackendOptions;
    interpolation?: IInterpolation;

    /**
     * TranslateI18Next options
     */
    use?: Array<any>;
    defaultUse?: Array<any>;
    mapping?:ITranslationKeyMapping;
    browserLanguageDetector?:ILanguageDetector;
    supportedLanguages?: Array<string>;
}
