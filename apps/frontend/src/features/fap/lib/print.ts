/** Prints the FAP sheet via the browser print dialog. */

export function printFapDocument(_fapNumber?: string) {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
