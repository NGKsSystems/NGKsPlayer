export function toFileUrl(p) {
  return 'file:///' + p
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/')
    .replace(/#/g, '%23');
}
