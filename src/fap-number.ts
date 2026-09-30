const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function nextFapNumber(applications: {fapNumber?: string}[], date = new Date()): string {
  const year = date.getUTCFullYear();
  const largest = applications.reduce((max, application) => {
    const match = /^(\d+)\/AF\/(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(\d{4})$/.exec(application.fapNumber || '');
    return match && Number(match[2]) === year ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${String(largest + 1).padStart(3, '0')}/AF/${romanMonths[date.getUTCMonth()]}/${year}`;
}
