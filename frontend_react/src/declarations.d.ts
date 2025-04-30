// src/declarations.d.ts

declare module '*.svg' {
    const content: any; // Or you can specify an appropriate type
    export default content;
}

declare module '*.png' {
    const content: any; // Add other image types as necessary
    export default content;
}

declare module '*.jpg' {
    const content: any;
    export default content;
}

declare module '*.gif' {
    const content: any;
    export default content;
}

declare module '*.css' {
    const content: any;
    export default content;
}