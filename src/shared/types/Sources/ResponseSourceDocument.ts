export type ResponseSourceDocument = {
    content: string | null;
    score: number;
    metadata: number | Record<string, string | number | boolean>;
};
