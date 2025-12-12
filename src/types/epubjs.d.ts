declare module 'epubjs' {
    export default class ePub {
        constructor(urlOrData: string | ArrayBuffer, options?: any);
        renderTo(element: HTMLElement | string, options?: any): any;
        destroy(): void;
    }
}
