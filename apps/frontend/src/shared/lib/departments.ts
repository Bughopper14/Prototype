/** How a department is shown: its name and its code ("Marketing (MKT)"), or only the code when the name is the same. The code is what is stored. */
export const departmentLabel = (d: {code: string; name?: string | null}) => (d.name && d.name !== d.code ? `${d.name} (${d.code})` : d.code);
