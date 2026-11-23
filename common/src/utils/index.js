export function formatDate(date) {
    return date.toISOString();
}
export function parseDate(dateString) {
    return new Date(dateString);
}
export function isNonNull(value) {
    return value !== null && value !== undefined;
}
//# sourceMappingURL=index.js.map