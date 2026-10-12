// Vite/CRA görsel ve ses importunu URL olarak, Next.js ise { src } nesnesi olarak verir; ikisini de destekle.
export const src = (asset) => (typeof asset === 'string' ? asset : asset?.src ?? '');
