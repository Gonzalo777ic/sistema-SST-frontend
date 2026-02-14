/**
 * Helper para catálogo de ubigeo Perú (departamentos, provincias, distritos)
 * Usa datos de ubigeo-peru (RENIEC). Guardamos el nombre para consistencia con BD.
 */

export interface UbigeoItem {
  codigo: string;
  nombre: string;
}

let ubigeoData: Array<{ departamento: string; provincia: string; distrito: string; nombre: string }> | null = null;

async function getUbigeoData() {
  if (!ubigeoData) {
    const mod = await import('ubigeo-peru');
    ubigeoData = (mod as any).reniec || [];
  }
  return ubigeoData;
}

export async function getDepartamentos(): Promise<UbigeoItem[]> {
  const data = await getUbigeoData();
  const seen = new Set<string>();
  return data
    .filter((d) => d.provincia === '00' && d.distrito === '00')
    .map((d) => ({ codigo: d.departamento, nombre: d.nombre }))
    .filter((d) => {
      if (seen.has(d.codigo)) return false;
      seen.add(d.codigo);
      return true;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getProvincias(departamentoCodigo: string): Promise<UbigeoItem[]> {
  const data = await getUbigeoData();
  const seen = new Set<string>();
  return data
    .filter(
      (d) =>
        d.departamento === departamentoCodigo &&
        d.distrito === '00' &&
        d.provincia !== '00',
    )
    .map((d) => ({ codigo: d.provincia, nombre: d.nombre }))
    .filter((d) => {
      if (seen.has(d.codigo)) return false;
      seen.add(d.codigo);
      return true;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getDistritos(
  departamentoCodigo: string,
  provinciaCodigo: string,
): Promise<UbigeoItem[]> {
  const data = await getUbigeoData();
  return data
    .filter(
      (d) =>
        d.departamento === departamentoCodigo &&
        d.provincia === provinciaCodigo &&
        d.distrito !== '00',
    )
    .map((d) => ({ codigo: d.distrito, nombre: d.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Obtiene el código de departamento por nombre (para cascading desde valores guardados) */
export async function getDepartamentoCodigoByNombre(nombre: string): Promise<string | null> {
  const depts = await getDepartamentos();
  const found = depts.find((d) => d.nombre === nombre);
  return found?.codigo ?? null;
}

/** Obtiene el código de provincia por nombre dentro de un departamento */
export async function getProvinciaCodigoByNombre(
  departamentoCodigo: string,
  provinciaNombre: string,
): Promise<string | null> {
  const provs = await getProvincias(departamentoCodigo);
  const found = provs.find((d) => d.nombre === provinciaNombre);
  return found?.codigo ?? null;
}
